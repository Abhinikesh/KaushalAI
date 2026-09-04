import { Brain } from 'lucide-react'
import RoadmapNotice from '../../components/shared/RoadmapNotice'

export default function AiConfigurationPage() {
  return (
    <RoadmapNotice
      title="AI Model Hyper-parameters &amp; Dynamic Fine-Tuning"
      subtitle="Administrative tuning for dense embedding representations, vector search thresholds, and LLM inference engines"
      icon={Brain}
      phase="Phase II Enterprise AI Architecture"
      description="In an enterprise deployment, this module empowers statistical administrators to tune vector cosine similarity thresholds, dynamically switch embedding backbones (e.g. from MiniLM-L6 to custom MOSPI fine-tuned sentence transformers), and configure rate-limits and token quotas for AI-driven MCQ generation and personalized tutoring."
      prerequisites={[
        'Dedicated GPU inference server (NVIDIA A10G/T4) with Triton Inference Server or FastAPI vLLM worker pool.',
        'Domain-specific statistical training corpus for continuous contrastive fine-tuning.',
        'Institutional API key management vault (HashiCorp Vault or AWS KMS) for government LLM endpoints.',
      ]}
    />
  )
}
