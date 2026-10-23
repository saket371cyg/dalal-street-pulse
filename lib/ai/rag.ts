import { GoogleGenAI } from '@google/genai';
import { RAGDocumentChunk, RAGChunkSnippet, RAGAskResponse } from '@/types';
import { getRAGChunks, bulkSaveRAGChunks, countRAGChunks } from '@/lib/db/store';
import { INITIAL_KNOWLEDGE_BASE } from './knowledge-seed';
import { VERIFIED_INDIAN_NEWS } from '@/lib/market-data/dataset';

// Initialize Gemini Client
const apiKey = process.env.AI_API_KEY || '';
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

const EMBEDDING_DIM = 768;

/**
 * Deterministic semantic hashing fallback for generating 768-dim embeddings
 * when operating offline or without an active AI_API_KEY
 */
function generateLocalEmbedding(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

  if (words.length === 0) return vec;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % EMBEDDING_DIM;
    vec[idx] += 1.0;

    // bigram feature
    if (i < words.length - 1) {
      const bi = word + '_' + words[i + 1];
      let biHash = 0;
      for (let k = 0; k < bi.length; k++) {
        biHash = (biHash << 5) - biHash + bi.charCodeAt(k);
        biHash |= 0;
      }
      const biIdx = Math.abs(biHash) % EMBEDDING_DIM;
      vec[biIdx] += 1.5;
    }
  }

  // L2 Normalize
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vec[i] /= norm;
    }
  }

  return vec;
}

/**
 * Generate 768-dimensional dense vector embeddings using Google Gemini text-embedding-004
 * with seamless fallback to deterministic local embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (genAI && apiKey) {
    try {
      const res = await genAI.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });

      const values = res.embeddings?.[0]?.values;
      if (values && values.length > 0) {
        return values;
      }
    } catch (err) {
      console.warn('[RAG] Gemini embedding API call failed, falling back to local embedding:', (err as Error).message);
    }
  }

  return generateLocalEmbedding(text);
}

/**
 * Cosine similarity between two float vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

let knowledgeBaseInitialized = false;

/**
 * Initializes the RAG knowledge store with pre-curated Indian equity disclosures,
 * corporate earnings, RBI monetary policy circulars, and live financial news.
 */
export async function initializeKnowledgeBase(force = false): Promise<number> {
  if (knowledgeBaseInitialized && !force) {
    return await countRAGChunks();
  }

  const existingCount = await countRAGChunks();
  if (existingCount > 0 && !force) {
    knowledgeBaseInitialized = true;
    return existingCount;
  }

  console.log('[RAG] Seeding initial knowledge chunks for Indian market intelligence...');
  const chunksToSave: RAGDocumentChunk[] = [];

  // 1. Process curated knowledge seed
  for (const item of INITIAL_KNOWLEDGE_BASE) {
    const textToEmbed = `${item.title}\n${item.companyName ? item.companyName + ' ' + (item.symbol || '') : ''}\n${item.content}`;
    const embedding = await generateEmbedding(textToEmbed);

    chunksToSave.push({
      ...item,
      embedding,
    });
  }

  // 2. Ingest verified Indian market news items
  try {
    for (const n of VERIFIED_INDIAN_NEWS.slice(0, 10)) {
      const textToEmbed = `${n.title}\n${n.summary}\nRelated: ${n.relatedSymbols.join(' ')}`;
      const embedding = await generateEmbedding(textToEmbed);

      chunksToSave.push({
        id: `rag_news_${n.id}`,
        documentId: n.id,
        symbol: n.relatedSymbols[0] || undefined,
        title: n.title,
        content: `${n.title}\n\n${n.summary}\n\nCategory: ${n.category.toUpperCase()} | Sentiment: ${n.sentiment.toUpperCase()}`,
        category: 'news',
        sourceUrl: n.sourceUrl,
        publishedAt: n.publishedAt,
        embedding,
        metadata: { source: n.source, relatedSymbols: n.relatedSymbols },
      });
    }
  } catch (err) {
    console.warn('[RAG] Failed to seed news items into knowledge base:', (err as Error).message);
  }

  await bulkSaveRAGChunks(chunksToSave);
  knowledgeBaseInitialized = true;
  console.log(`[RAG] Successfully indexed ${chunksToSave.length} knowledge chunks.`);
  return chunksToSave.length;
}

/**
 * Retrieve the most semantically relevant chunks for a question,
 * with optional stock symbol filtering and keyword relevance boosting.
 */
export async function retrieveRelevantChunks(
  query: string,
  options: { symbol?: string; category?: string; topK?: number } = {}
): Promise<RAGDocumentChunk[]> {
  await initializeKnowledgeBase();

  const { symbol, category, topK = 4 } = options;
  const queryEmbedding = await generateEmbedding(query);
  const candidates = await getRAGChunks({ symbol, category });

  const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const targetSymbol = symbol ? symbol.toUpperCase() : null;

  const scored = candidates.map(chunk => {
    let score = chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0;

    // Lexical / keyword boost
    const contentLower = (chunk.title + ' ' + chunk.content).toLowerCase();
    for (const token of queryTokens) {
      if (contentLower.includes(token)) {
        score += 0.08;
      }
    }

    // Exact symbol match boost
    if (targetSymbol && chunk.symbol?.toUpperCase() === targetSymbol) {
      score += 0.25;
    }

    return {
      ...chunk,
      score,
    };
  });

  scored.sort((a, b) => (b.score || 0) - (a.score || 0));
  return scored.slice(0, topK);
}

/**
 * Synthesizes an intelligent, grounded financial answer when operating
 * in offline or fallback mode (without active external Gemini API key)
 */
function buildOfflineGroundedAnswer(
  question: string,
  chunks: RAGDocumentChunk[],
  contextSymbol?: string
): { answer: string; relatedMetrics: string[] } {
  if (chunks.length === 0) {
    return {
      answer: `No specific financial disclosures or regulatory filings were matched for "${question}". Try querying broad Indian market concepts like **P/E ratio**, **ROCE**, **RBI repo rate**, or bluechip tickers like **RELIANCE**, **TCS**, **HDFCBANK**, or **INFY**.`,
      relatedMetrics: ['NSE Benchmark', 'BSE Sensex'],
    };
  }

  const primary = chunks[0];
  const relatedMetrics = new Set<string>();

  // Extract relevant financial metrics from retrieved chunks
  const allText = chunks.map(c => c.content).join(' ');
  if (allText.includes('P/E') || question.toLowerCase().includes('pe')) relatedMetrics.add('P/E Ratio');
  if (allText.includes('ROCE') || question.toLowerCase().includes('roce')) relatedMetrics.add('ROCE');
  if (allText.includes('ROE')) relatedMetrics.add('ROE');
  if (allText.includes('NIM') || allText.includes('Net Interest Margin')) relatedMetrics.add('Net Interest Margin (NIM)');
  if (allText.includes('Debt') || allText.includes('Leverage')) relatedMetrics.add('Debt-to-Equity');
  if (allText.includes('FII') || allText.includes('DII') || allText.includes('SIP')) relatedMetrics.add('FII / DII Institutional Flow');

  let answer = `### Grounded Analysis: ${primary.title}\n\n`;
  answer += `${primary.content}\n\n`;

  if (chunks.length > 1) {
    answer += `#### Additional Supporting Context\n`;
    for (let i = 1; i < chunks.length; i++) {
      const c = chunks[i];
      const snippet = c.content.split('\n')[0] || c.content.slice(0, 160);
      answer += `- **${c.title}**: ${snippet}\n`;
    }
  }

  if (contextSymbol) {
    relatedMetrics.add(`${contextSymbol} Valuation`);
  }

  return {
    answer,
    relatedMetrics: Array.from(relatedMetrics).slice(0, 4),
  };
}

/**
 * Grounded RAG Financial Analyst
 * Retrieves relevant NSE/BSE filings, disclosures, and educational standards,
 * and generates a fully grounded response with source citations.
 */
export async function askRAGAnalyst(
  question: string,
  contextSymbol?: string
): Promise<RAGAskResponse> {
  const startTime = Date.now();
  const topChunks = await retrieveRelevantChunks(question, {
    symbol: contextSymbol,
    topK: 4,
  });

  const groundedSources = topChunks.map(c => `${c.title} (${new Date(c.publishedAt).toLocaleDateString('en-IN')})`);
  const chunksUsed: RAGChunkSnippet[] = topChunks.map(c => ({
    title: c.title,
    category: c.category,
    symbol: c.symbol,
    snippet: c.content.length > 180 ? c.content.slice(0, 180) + '...' : c.content,
    sourceUrl: c.sourceUrl,
    publishedAt: c.publishedAt,
    relevanceScore: Math.round((c.score || 0) * 100) / 100,
  }));

  // If Gemini API is configured and accessible, use LLM generation with grounding prompt
  if (genAI && apiKey) {
    try {
      const contextText = topChunks
        .map((c, i) => `[Source ${i + 1}: ${c.title} | Category: ${c.category.toUpperCase()}]\n${c.content}`)
        .join('\n\n---\n\n');

      const systemPrompt = `You are an expert Indian Equity Analyst & Financial Intelligence Assistant for 'Dalal Street Pulse' (covering NSE and BSE).
Answer the user's question accurately using ONLY the grounded context provided below.
Rules:
1. Grounding: Do NOT hallucinate financial numbers or company statements. Cite sources explicitly like [Source 1], [Source 2].
2. Currency & Format: Format Indian currency in ₹ INR using Indian digit grouping (e.g. ₹15,420 Cr, ₹1,250.50).
3. Professionalism: Provide clear bullet points, valuation commentary, and balance sheet assessment.
4. If the context does not contain enough information, explain what is known and clarify what is missing.

User Question: ${question}
Context Stock Symbol: ${contextSymbol || 'N/A'}

Grounded Filings & Market Context:
${contextText || 'No direct filings found.'}
`;

      const response = await genAI.models.generateContent({
        model: process.env.AI_MODEL || 'gemini-1.5-flash',
        contents: systemPrompt,
      });

      const answerText = response.text || '';
      const relatedMetrics = ['NSE/BSE Reported Data', 'Grounded RAG'];
      if (contextSymbol) relatedMetrics.push(`${contextSymbol} Fundamentals`);

      return {
        answer: answerText,
        relatedMetrics,
        groundedSources,
        chunksUsed,
        modelUsed: process.env.AI_MODEL || 'gemini-1.5-flash',
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      console.warn('[RAG] Gemini generation failed, falling back to offline grounded synthesis:', (err as Error).message);
    }
  }

  // Resilient Offline Synthesis Fallback
  const offlineResult = buildOfflineGroundedAnswer(question, topChunks, contextSymbol);
  return {
    answer: offlineResult.answer,
    relatedMetrics: offlineResult.relatedMetrics,
    groundedSources,
    chunksUsed,
    modelUsed: 'RAG Grounded Rule-Engine (Offline Resilient Mode)',
    executionTimeMs: Date.now() - startTime,
  };
}
