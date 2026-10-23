import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateEmbedding,
  cosineSimilarity,
  retrieveRelevantChunks,
  askRAGAnalyst,
  initializeKnowledgeBase,
} from '@/lib/ai/rag';

describe('RAG (Retrieval-Augmented Generation) Pipeline', () => {
  beforeAll(async () => {
    await initializeKnowledgeBase();
  });

  it('generates 768-dimensional normalized embeddings', async () => {
    const text = 'HDFC Bank credit growth and loan to deposit ratio';
    const embedding = await generateEmbedding(text);

    expect(embedding).toBeDefined();
    expect(embedding.length).toBe(768);

    // Verify L2 normalization: norm should be approximately 1.0
    const norm = Math.sqrt(embedding.reduce((acc, v) => acc + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 1);
  });

  it('computes cosine similarity accurately', () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];

    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 4);
    expect(cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0, 4);
  });

  it('retrieves relevant knowledge chunks for corporate filings', async () => {
    const results = await retrieveRelevantChunks('What are the margins and cloud deals for TCS?', {
      topK: 3,
    });

    expect(results.length).toBeGreaterThan(0);
    const top = results[0];
    expect(top.symbol).toBe('TCS');
    expect(top.content).toContain('Tata Consultancy Services');
  });

  it('retrieves macroeconomic monetary policy context for RBI queries', async () => {
    const results = await retrieveRelevantChunks('How is RBI managing liquidity and repo rate?', {
      topK: 2,
    });

    expect(results.length).toBeGreaterThan(0);
    const hasRbiDoc = results.some(r => r.category === 'macro' || r.title.includes('RBI'));
    expect(hasRbiDoc).toBe(true);
  });

  it('filters knowledge retrieval by stock symbol when specified', async () => {
    const results = await retrieveRelevantChunks('What are the financial metrics?', {
      symbol: 'RELIANCE',
      topK: 2,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => !r.symbol || r.symbol === 'RELIANCE')).toBe(true);
  });

  it('generates grounded RAG response with source citations and chunks used', async () => {
    const response = await askRAGAnalyst('Explain ROCE vs ROE in Dalal Street');

    expect(response.answer).toBeDefined();
    expect(response.answer.length).toBeGreaterThan(50);
    expect(response.groundedSources.length).toBeGreaterThan(0);
    expect(response.chunksUsed).toBeDefined();
    expect(response.chunksUsed?.length).toBeGreaterThan(0);
  });
});
