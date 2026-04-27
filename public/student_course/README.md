# Agentic AI — Building Intelligent Systems with GenAI

A 5-module curriculum that takes a student from prompting fundamentals to autonomous multi-agent systems with full observability. Each module ends with a **capstone** designed to make the student *grasp the key concept by applying it* — not as a final exam, but as the primary learning vehicle.

## How a capstone is structured (every module follows this)

1. **Concept Recall** — short questions the student answers in markdown before writing any code.
2. **Guided Build** — scaffolded code with `# TODO` markers; the student fills in the load-bearing parts.
3. **Independent Extension** — open-ended challenges that force transfer of the concept to a new context.
4. **Evaluation Harness** — the student writes the tests/metrics that grade their own system.
5. **Monitoring Hook-up** — every capstone must emit telemetry (tokens, latency, cost, quality) so the student internalises that *shipping = measuring*.

## Modules

| # | Folder | Capstone | Concepts you will *apply* |
|---|---|---|---|
| 1 | `module1_genai_foundations/` | Structured Insight Extractor | Prompt engineering, structured output, eval harness |
| 2 | `module2_finetuning/` | Domain-Specialist Mini-LLM | LoRA/QLoRA, quantization, instruction tuning |
| 3 | `module3_langchain_rag/` | Enterprise Knowledge Assistant | Chunking, embeddings, hybrid + reranked retrieval |
| 4 | `module4_mcp/` | LMS Tool Pack (MCP) | Protocol design, tool schemas, auth scoping |
| 5 | `module5_agents/` | Autonomous Research Analyst | ReAct, LangGraph, multi-agent, guardrails |
| ★ | `final_capstone/` | Personal Learning Coach | All five modules composed end-to-end |

## Pre-requisites

- Python 3.10+
- Comfort with HTTP/JSON
- An API key for one frontier LLM provider (OpenAI / Anthropic / Groq) **or** a local Ollama install
- ~16 GB RAM minimum for Module 3+; a CUDA GPU (or Colab Pro) for Module 2

## Grading model

- Each module capstone: **out of 100**, ≥70 to pass, certificate-eligible.
- Final capstone: **out of 200**, ≥150 = distinction.
- Auto-graded portions run in the notebook's `Evaluation` section; rubric portions reviewed by an instructor or LLM-judge.
