import pytest
from app.services.writer_service import writer_service

@pytest.mark.asyncio
async def test_writer_autocomplete():
    sample_papers = [
        {
            "id": "p-1",
            "title": "Attention Is All You Need",
            "authors": ["Vaswani et al."],
            "year": 2017,
            "abstract": "We introduce the Transformer, relying entirely on self-attention.",
            "claims": [{"text": "Self-attention replaces recurrent neural networks entirely."}]
        }
    ]
    res = await writer_service.autocomplete("The transformer model architecture", sample_papers)
    assert res is not None
    assert "suggestion" in res
    assert len(res["suggestion"]) > 10

@pytest.mark.asyncio
async def test_writer_synthesize_debate():
    paper_a = {
        "id": "p-bert",
        "title": "BERT Pretraining",
        "authors": ["Devlin et al."],
        "year": 2018,
        "claims": [{"text": "Next sentence prediction is necessary for natural language inference."}]
    }
    paper_b = {
        "id": "p-roberta",
        "title": "RoBERTa Robust Optimization",
        "authors": ["Liu et al."],
        "year": 2019,
        "claims": [{"text": "Next sentence prediction degrades task performance."}]
    }
    res = await writer_service.synthesize_debate(paper_a, paper_b, "CONTRADICTS")
    assert res is not None
    assert "text" in res
    assert "Devlin et al." in res["text"]
    assert "Liu et al." in res["text"]

@pytest.mark.asyncio
async def test_writer_generate_bridge():
    papers = [
        {"id": "p-1", "title": "Paper 1", "authors": ["Author 1"], "year": 2017},
        {"id": "p-2", "title": "Paper 2", "authors": ["Author 2"], "year": 2020},
        {"id": "p-3", "title": "Paper 3", "authors": ["Author 3"], "year": 2023}
    ]
    res = await writer_service.generate_bridge(papers)
    assert res is not None
    assert "text" in res
    assert "Author 1" in res["text"]
    assert "Author 3" in res["text"]

@pytest.mark.asyncio
async def test_writer_paraphrase():
    res = await writer_service.paraphrase_academic("i think this model is very good")
    assert res is not None
    assert "the evidence suggests" in res["result"].lower() or "substantially advantageous" in res["result"].lower()
