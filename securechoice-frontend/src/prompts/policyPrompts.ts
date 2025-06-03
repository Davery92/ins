export const policyPrompts: Record<string, string[]> = {
  'general-liability': [
    "Analyze my general liability coverage limits and exclusions",
    "What gaps exist in my business liability protection?",
    "Review my aggregate and per-occurrence limits",
    "Assess product liability and premises coverage"
  ],
  'commercial-property': [
    "Evaluate my building and equipment coverage limits",
    "Review business personal property protection",
    "What natural disaster coverage do I have?",
    "Assess replacement cost vs actual cash value coverage"
  ],
  'workers-comp': [
    "Analyze my workers compensation coverage by class code",
    "Review experience modification factors and rates",
    "What return-to-work programs are available?",
    "Assess coverage for independent contractors"
  ],
  'professional-liability': [
    "Review errors and omissions coverage limits",
    "Analyze professional liability exclusions and scope",
    "What prior acts coverage do I have?",
    "Assess coverage for cyber professional liability"
  ],
  'cyber-liability': [
    "Evaluate data breach response and notification coverage",
    "Review cyber extortion and ransomware protection",
    "What business interruption cyber coverage exists?",
    "Assess third-party cyber liability limits"
  ],
  'commercial-auto': [
    "Analyze commercial vehicle liability limits",
    "Review hired and non-owned auto coverage",
    "What fleet safety programs reduce premiums?",
    "Assess cargo and equipment coverage"
  ],
  'business-interruption': [
    "Review business income and extra expense coverage",
    "Analyze waiting period and coverage triggers",
    "What contingent business interruption coverage exists?",
    "Assess civil authority and ingress/egress coverage"
  ],
  'directors-officers': [
    "Evaluate D&O coverage for entity vs individual",
    "Review employment practices liability coverage",
    "What fiduciary liability protection exists?",
    "Assess side A, B, and C coverage differences"
  ]
};

export const defaultPolicyPrompts: string[] = [
  "Analyze the key coverage areas in my commercial policy",
  "What are the main business risks and limitations?",
  "Review policy limits and deductibles",
  "Assess overall commercial protection gaps"
]; 