import { CategoryType, CryptoAlgorithmDef, Finding, RemediationInfo } from './types.js';
import { GoogleGenAI } from '@google/genai';

export function generateRecommendation(
  algo: CryptoAlgorithmDef,
  finding: { file: string; line: number; code: string }
): { recommendation: string; remediation: RemediationInfo } {
  let recommendation = '';
  let problem = '';
  let whyItMatters = '';
  let suggestedDirection = '';
  let developerNextStep = '';
  let diffPreview: { original: string; replacement: string; explanation: string } | undefined = undefined;

  switch (algo.category) {
    case 'ASYMMETRIC_KEY_EXCHANGE':
      if (algo.quantum_status === 'VULNERABLE_SHOR') {
        recommendation = `Evaluate migrating public-key key agreement (${algo.name}) toward standardized post-quantum key encapsulation mechanisms such as ML-KEM (FIPS 203). Consider hybrid key exchange (e.g. X25519 + ML-KEM-768) during transition phases to preserve classical security guarantees.`;
        problem = `Usage of ${algo.name} relies on mathematical problems (integer factorization or discrete logarithms) that are soluble in polynomial time on a cryptanalytically relevant quantum computer (CRQC).`;
        whyItMatters = `Adversaries can perform 'Store-Now-Decrypt-Later' (SNDL) attacks by harvesting encrypted traffic today to decrypt once quantum hardware emerges. Sensitive data with multi-year lifespans is directly at risk.`;
        suggestedDirection = `Evaluate candidate post-quantum KEMs (ML-KEM-768 / ML-KEM-1024) or dual-hybrid key establishment in TLS / transport layers.`;
        developerNextStep = `Abstract key agreement calls behind a crypto provider interface and benchmark ML-KEM ciphertext sizes in your network transport layer.`;
      } else {
        recommendation = `Maintain ${algo.name} deployment and verify compliance with NIST FIPS 203 parameter specifications.`;
        problem = `Active post-quantum key exchange identified.`;
        whyItMatters = `Algorithm provides quantum-resistant key encapsulation.`;
        suggestedDirection = `Ensure constant-time implementations and secure random number generation.`;
        developerNextStep = `Verify dependencies remain on up-to-date patched cryptographic libraries.`;
      }
      break;

    case 'DIGITAL_SIGNATURES':
      if (algo.quantum_status === 'VULNERABLE_SHOR') {
        recommendation = `Evaluate transitioning digital signatures from ${algo.name} toward post-quantum signature schemes such as ML-DSA (FIPS 204) or SLH-DSA (FIPS 205). Consider hybrid signature verification for backward compatibility.`;
        problem = `Signatures generated using ${algo.name} are susceptible to quantum forgery using Shor's algorithm, which enables private key derivation from public keys.`;
        whyItMatters = `Digital certificates, code-signing tokens, firmware updates, and audit trails signed with this algorithm will lose repudiation resistance once quantum computing scales.`;
        suggestedDirection = `Evaluate candidate post-quantum signature algorithms like ML-DSA-65 or stateful hash-based signatures (LMS/XMSS) for firmware.`;
        developerNextStep = `Inventory certificate chains and verify whether downstream consumers support enlarged post-quantum signature payloads.`;
      } else {
        recommendation = `Maintain post-quantum signature implementation (${algo.name}). Monitor NIST implementation guidelines.`;
        problem = `Standardized post-quantum signature scheme in use.`;
        whyItMatters = `Provides quantum-safe authenticity verification.`;
        suggestedDirection = `Maintain library versioning and follow key-state safety rules.`;
        developerNextStep = `Ensure proper memory clearance and verification error handling.`;
      }
      break;

    case 'SYMMETRIC_ENCRYPTION':
    case 'AEAD':
      if (algo.classical_security === 'BROKEN' || algo.classical_security === 'WEAK') {
        recommendation = `Prioritize immediate migration from legacy cipher ${algo.name} toward modern authenticated symmetric encryption such as AES-256-GCM or ChaCha20-Poly1305.`;
        problem = `Algorithm ${algo.name} is classically compromised due to restricted block sizes, small key spaces, or known cryptanalytic weaknesses.`;
        whyItMatters = `Exposes operational systems to immediate, non-quantum exploits (such as Sweet32 collision attacks or brute-force key derivation).`;
        suggestedDirection = `Consider evaluating AES-256-GCM with distinct random nonces for all encrypted payloads.`;
        developerNextStep = `Replace deprecated cipher instantiation with standard AES-256-GCM cipher suite and rotate existing session keys.`;
      } else if (algo.name.includes('128')) {
        recommendation = `Evaluate upgrading key lengths from ${algo.name} to AES-256-GCM for long-term cryptographic posture. Grover's quantum search reduces effective 128-bit key strength to 64 bits.`;
        problem = `128-bit symmetric key sizes face a theoretical quantum search reduction under Grover's algorithm.`;
        whyItMatters = `While not practically breakable today, 128-bit symmetric ciphers offer lower quantum security margins compared to 256-bit alternatives.`;
        suggestedDirection = `Consider evaluating AES-256-GCM or ChaCha20-Poly1305 in authenticated mode.`;
        developerNextStep = `Plan an evolutionary upgrade to 256-bit keys in upcoming schema revisions.`;
      } else {
        recommendation = `Maintain ${algo.name}. AES-256 and authenticated ciphers retain 128 bits of quantum security under Grover's algorithm, satisfying post-quantum criteria. Do not replace AES; ensure authenticated modes (GCM) are enforced.`;
        problem = `Symmetric encryption in use.`;
        whyItMatters = `AES-256 is quantum resistant. The Grover algorithm achieves quadratic speedup, meaning AES-256 still requires 2^128 operations—well beyond computational reach.`;
        suggestedDirection = `Maintain current implementation; verify nonce uniqueness and authenticated encryption tags.`;
        developerNextStep = `Audit nonce generation mechanisms to guarantee absence of nonce reuse across cipher operations.`;
      }
      break;

    case 'HASH_FUNCTIONS':
    case 'HASH_XOF_MAC':
      if (algo.classical_security === 'BROKEN' || algo.classical_security === 'WEAK') {
        recommendation = `Migrate from vulnerable hash function ${algo.name} toward modern secure hashing primitives such as SHA-256, SHA-512, SHA3-256, or BLAKE3.`;
        problem = `Hash algorithm ${algo.name} possesses demonstrated practical collision vulnerabilities.`;
        whyItMatters = `Attackers can forge duplicate certificates, tamper with file checksums, or spoof digital integrity verifications.`;
        suggestedDirection = `Consider candidate hash replacements: SHA-256 for general compliance, or SHA3-256 for length-extension resilience.`;
        developerNextStep = `Update hashing function calls and upgrade database column sizes to accommodate 256-bit or 512-bit digest outputs.`;
      } else {
        recommendation = `Maintain ${algo.name}. Modern hash functions (SHA-256/384/512, SHA-3) maintain quantum collision resistance of >= 128 bits, providing robust post-quantum resilience.`;
        problem = `Standard cryptographic hash function.`;
        whyItMatters = `Quantum computers require 2^(n/3) or 2^(n/2) operations for collision finding; 256-bit hashes comfortably exceed security thresholds.`;
        suggestedDirection = `Maintain current implementation. Consider SHA-384 or SHA-3 if length-extension attacks are a structural concern.`;
        developerNextStep = `Verify hash is not used as a raw password storage mechanism without salt and iterations.`;
      }
      break;

    case 'PASSWORD_HASHING_KDF':
      if (algo.id === 'pbkdf2' || algo.id === 'kdf1' || algo.id === 'kdf2') {
        recommendation = `Evaluate transitioning to modern memory-hard password hashing schemes such as Argon2id (RFC 9106) or scrypt. For key derivation, evaluate HKDF (RFC 5869).`;
        problem = `PBKDF2 lacks memory hardness, permitting cost-effective GPU and ASIC offline dictionary acceleration.`;
        whyItMatters = `User credential databases remain vulnerable to accelerated offline password recovery attacks if intercepted.`;
        suggestedDirection = `Evaluate candidate password hashing standard Argon2id.`;
        developerNextStep = `Adopt progressive credential re-hashing on successful login to migrate users transparently to Argon2id.`;
      } else {
        recommendation = `Maintain ${algo.name} password hashing. Verify iteration counts, memory parameters, and salt entropy.`;
        problem = `Modern memory-hard hashing function in use.`;
        whyItMatters = `Protects against both classical parallel GPU attacks and quantum brute force.`;
        suggestedDirection = `Keep parameter tuning aligned with OWASP password storage recommendations.`;
        developerNextStep = `Regularly review benchmark execution times to keep verification delays within 500ms bounds.`;
      }
      break;

    default:
      recommendation = `Evaluate cryptographic asset ${algo.name} for quantum agility and compliance with organizational security baseline.`;
      problem = `Cryptographic operation identified in source code.`;
      whyItMatters = `Cryptographic algorithms must be cataloged in the CBOM for auditability and risk tracking.`;
      suggestedDirection = `Catalog implementation and establish crypto-agility abstraction.`;
      developerNextStep = `Ensure algorithm choices are decoupled from hardcoded logic.`;
  }

  // Generate a realistic, reviewable suggested code diff based on the detected line
  const trimmed = finding.code.trim();
  if (algo.id === 'md5') {
    diffPreview = {
      original: trimmed,
      replacement: trimmed.replace(/hashlib\.md5/g, 'hashlib.sha256').replace(/createHash\(['"]md5['"]\)/g, 'createHash("sha256")').replace(/MD5/g, 'SHA-256'),
      explanation: 'Replaces broken MD5 digest with collision-resistant SHA-256.'
    };
  } else if (algo.id === 'sha-1') {
    diffPreview = {
      original: trimmed,
      replacement: trimmed.replace(/hashlib\.sha1/g, 'hashlib.sha256').replace(/createHash\(['"]sha1['"]\)/g, 'createHash("sha256")').replace(/SHA-1/g, 'SHA-256'),
      explanation: 'Replaces deprecated SHA-1 hash with SHA-256.'
    };
  } else if (algo.id === 'des' || algo.id === '3des' || algo.id === 'rc4') {
    diffPreview = {
      original: trimmed,
      replacement: trimmed.replace(/DES/g, 'AES').replace(/ARC4/g, 'AES').replace(/rc4/g, 'aes-256-gcm'),
      explanation: 'Replaces broken/weak cipher with AES-256 authenticated mode.'
    };
  } else if (algo.id === 'rsa') {
    diffPreview = {
      original: trimmed,
      replacement: `// Migration candidate: Integrate ML-KEM or hybrid encapsulation\n// ${trimmed}`,
      explanation: 'Wrap RSA call with hybrid post-quantum encapsulation abstraction.'
    };
  }

  return {
    recommendation,
    remediation: {
      problem,
      whyItMatters,
      suggestedDirection,
      developerNextStep,
      suggestedDiff: diffPreview
    }
  };
}

export async function getAiAdvisory(finding: Finding): Promise<{
  advice: string;
  source: 'GEMINI_AI' | 'DETERMINISTIC_ENGINE';
}> {
  const isAes256 =
    finding.algorithmName.toUpperCase().includes('AES-256') ||
    (finding.algorithmName.toUpperCase().includes('AES') && String(finding.keySize || '').includes('256'));

  if (isAes256) {
    return {
      advice:
        `[Post-Quantum Cryptographic Advisory]\n\n` +
        `Algorithm: ${finding.algorithmName} (256-bit Symmetric Key)\n\n` +
        `Cryptographic Assessment:\n` +
        `AES-256 remains quantum-resistant. Grover's algorithm reduces effective strength to 128 bits, which is still secure. Migration is NOT required.\n\n` +
        `Implementation Verification Checklist:\n` +
        `1. Ensure authenticated encryption mode is used (prefer AES-256-GCM or AES-256-CCM) rather than unauthenticated modes (CBC / ECB).\n` +
        `2. Enforce strict nonce uniqueness for each encryption operation to prevent IV collision vulnerabilities.\n` +
        `3. Maintain standard key rotation intervals and secure key storage using hardware-backed keystores (HSM / KMS).\n\n` +
        `Note: Do NOT replace AES-256 with experimental primitives; standard AES-256 retains sufficient security margins well into the post-quantum era.`,
      source: 'DETERMINISTIC_ENGINE',
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      advice: `[Deterministic Advisory Engine]\n\n` +
        `Algorithm: ${finding.algorithmName} (${finding.category})\n` +
        `Quantum Exposure: ${finding.quantumStatus}\n` +
        `Classical Security: ${finding.classicalSecurity}\n\n` +
        `Key Architectural Observations:\n` +
        `1. ${finding.remediation.problem}\n` +
        `2. ${finding.remediation.whyItMatters}\n` +
        `3. Strategic Migration Direction: ${finding.remediation.suggestedDirection}\n\n` +
        `Implementation Checklist:\n` +
        `- Step 1: ${finding.remediation.developerNextStep}\n` +
        `- Step 2: Ensure crypto-agility by abstracting algorithm selection into an injectable provider.\n` +
        `- Step 3: Run regression tests to verify payload format compatibility across consumers.\n` +
        `- Step 4: Do not silently rewrite code; verify compatibility using test suites and provide explicit diff reviews.`,
      source: 'DETERMINISTIC_ENGINE',
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are a Post-Quantum Cryptography (PQC) and Cyber Risk expert analyzing a code finding in an enterprise repository.
Finding details:
- File: ${finding.file}
- Line: ${finding.line}
- Code Snippet: ${finding.code}
- Algorithm: ${finding.algorithmName} (${finding.algorithmType})
- Category: ${finding.category}
- Key Size: ${finding.keySize || 'N/A'}
- Quantum Status: ${finding.quantumStatus}
- Classical Status: ${finding.classicalSecurity}
- Risk Level: ${finding.riskLevel} (Score: ${finding.riskScore}/100)
- Priority: ${finding.priority}

Provide a concise, highly technical migration advisory for enterprise engineering teams.
Strict Rules:
1. Explain WHY the algorithm is vulnerable (e.g. Shor's algorithm polynomial time factoring/discrete log for RSA/ECC, collision attacks for MD5/SHA1, Grover halving for symmetric keys < 256 bits).
2. Recommend the appropriate post-quantum replacement algorithm:
   - RSA / ECC key exchange -> ML-KEM (Kyber / FIPS 203) or hybrid (X25519 + ML-KEM-768)
   - RSA / ECDSA signatures -> ML-DSA (Dilithium / FIPS 204) or SLH-DSA (SPHINCS+ / FIPS 205)
   - Weak hashing (MD5, SHA-1) -> SHA-256 / SHA-3 (FIPS 202)
   - Symmetric keys < 256 bits (e.g. AES-128, 3DES) -> AES-256-GCM
3. If AES-256 is detected, do NOT recommend replacing it:
   Explain: 'AES-256 remains quantum-resistant. Grover's algorithm reduces effective strength to 128 bits, which is still secure. Migration is NOT required.'
4. Give concrete developer next steps (abstract behind cryptographic provider, verify ciphertext/key buffer allocations, test backward compatibility).
5. Do NOT silently rewrite files. Provide clear code diff preview and instructions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '';
    if (text.trim().length > 0) {
      return {
        advice: text,
        source: 'GEMINI_AI',
      };
    }
  } catch (err) {
    console.warn('Gemini AI advisory error, falling back to deterministic engine:', err);
  }

  return {
    advice: `[Deterministic Advisory Engine]\n\n` +
      `Algorithm: ${finding.algorithmName} (${finding.category})\n` +
      `Strategic Migration Direction: ${finding.remediation.suggestedDirection}\n\n` +
      `Developer Next Step: ${finding.remediation.developerNextStep}`,
    source: 'DETERMINISTIC_ENGINE',
  };
}
