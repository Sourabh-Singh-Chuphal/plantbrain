"""
PlantBrain — Pydantic Schemas
All request/response models used across the API.
"""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Document Types ────────────────────────────────────────────────────────────

class DocumentType(str, Enum):
    work_order         = "work_order"
    manual             = "manual"
    inspection_report  = "inspection_report"
    incident_report    = "incident_report"
    shift_log          = "shift_log"
    regulation         = "regulation"
    unknown            = "unknown"


# ── Entity Extraction ─────────────────────────────────────────────────────────

class ExtractedEntities(BaseModel):
    equipment_tags:   list[str] = Field(default_factory=list)
    dates:            list[str] = Field(default_factory=list)
    regulatory_refs:  list[str] = Field(default_factory=list)
    personnel:        list[str] = Field(default_factory=list)
    document_type:    DocumentType = DocumentType.unknown


# ── Ingestion ─────────────────────────────────────────────────────────────────

class DocumentAnalysis(BaseModel):
    summary:            str
    issue_identified:   str
    recommended_action: str


class IngestionSummary(BaseModel):
    document_id:      str
    filename:         str
    document_type:    DocumentType
    chunks_created:   int
    entities_found:   ExtractedEntities
    analysis:         Optional[DocumentAnalysis] = None
    processing_time_s: float
    status:           str = "success"
    error:            Optional[str] = None


# ── Copilot ───────────────────────────────────────────────────────────────────

class CopilotRequest(BaseModel):
    question: str
    session_id: Optional[str] = None


class Citation(BaseModel):
    document:  str
    page:      Optional[int] = None
    snippet:   str


class CopilotResponse(BaseModel):
    answer:     str
    citations:  list[Citation]
    confidence: str  # "high" | "medium" | "low"
    cached:     bool = False
    latency_ms: Optional[float] = None


# ── Compliance ────────────────────────────────────────────────────────────────

class ComplianceStatus(str, Enum):
    covered  = "covered"
    partial  = "partial"
    missing  = "missing"


class ComplianceClause(BaseModel):
    clause_id:       str
    clause_text:     str
    status:          ComplianceStatus
    justification:   str
    matched_excerpt: Optional[str] = None


class ComplianceReport(BaseModel):
    regulation_doc:  str
    procedure_docs:  list[str]
    clauses:         list[ComplianceClause]
    generated_at:    datetime = Field(default_factory=datetime.utcnow)
    summary:         dict[str, int] = Field(default_factory=dict)  # {covered:N, partial:N, missing:N}


# ── Graph ─────────────────────────────────────────────────────────────────────

class GraphStats(BaseModel):
    documents:   int = 0
    equipment:   int = 0
    persons:     int = 0
    incidents:   int = 0
    regulations: int = 0
    total_edges: int = 0


class RelatedDocument(BaseModel):
    document_id:   str
    filename:      str
    document_type: str
    date:          Optional[str] = None
    relationship:  str


class PatternAlert(BaseModel):
    equipment_tag:  str
    pattern_summary: str
    documents_involved: list[str]
    risk_level:     str  # "high" | "medium" | "low"
    years_span:     int


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status:           str
    chroma_chunks:    int
    neo4j_connected:  bool
    app_env:          str
    version:          str = "1.0.0"
