# Sentinel — Synthetic Data Corpus README

## Plant: Vindhya Steelworks Pvt. Ltd.
**Location:** Chandrapur Industrial Zone, Maharashtra — 442 401

This corpus contains 11 realistic synthetic documents spanning 2018–2026,
all internally consistent and cross-referenced. They are designed to demonstrate
Sentinel's cross-document pattern detection capability.

---

## 🧠 The Core Demo Pattern (GB-14)

The entire corpus is built around ONE recurring safety pattern that spans 7 years and 9 documents:

```
Sept 2018 → March 2019 → July 2021 → Aug 2024 → Aug 2024 → Dec 2025 → Jan 2026 → Feb 2026
  WO-3591       NMR-2019    SIR-2021   WO-4471    WO-4476    SAR-2025    WO-4892    RCA-2026
  (cal OK)      (near-miss) (follow-up) (repeat!)  (HX-11)   (warning)  (repeat!)  (root cause)
```

**The Pattern:** GB-14 sensor gives elevated reading (>15% LEL) while hot work permit
is active in Bay 4. Same equipment, same location, three times in 7 years.
No system detected this pattern — only long-serving humans (Rajiv Sharma, Anil Mehta,
Suresh Kumar) recognised it.

**Sentinel's job:** Surface this pattern BEFORE the third incident happens.

---

## 📁 Document Inventory

### incidents/ (4 files)
| File | ID | Date | Summary |
|---|---|---|---|
| incident_2019_03_GB14_near_miss.txt | NMR-2019-047 | Mar 2019 | **THE ANCHOR** — GB-14 at 27% LEL, hot work active, near-miss |
| incident_2022_08_crane_swing_near_miss.txt | NMR-2022-031 | Aug 2022 | Unrelated CR-03 crane swing near-miss (adds corpus diversity) |
| rca_2026_007_GB14_pattern_analysis.txt | RCA-2026-007 | Feb 2026 | Full 5-Why RCA — ties the entire 7-year pattern together |
| *(add more)* | | | |

### work_orders/ (5 files)
| File | ID | Date | Summary |
|---|---|---|---|
| work_order_WO3591_2018_GB14_calibration.txt | WO-3591 | Sep 2018 | Last routine cal before 2019 incident — calibration gap established |
| work_order_WO4471_2024_GB14_calibration.txt | WO-4471 | Aug 2024 | **Second occurrence** — 18% LEL, sensor drift + HX-11 noted |
| work_order_WO4476_2024_HX11_flange_seepage.txt | WO-4476 | Aug 2024 | HX-11 Flange #7 — closed "partial", gasket not replaced |
| work_order_WO4892_2026_GB14_critical.txt | WO-4892 | Jan 2026 | **Third occurrence** — 22% LEL, critical, pattern named explicitly |
| work_order_WO4901_2026_PM07_bearings.txt | WO-4901 | Feb 2026 | Routine PM-07 work showing corrected permit process post-WO-4892 |

### shift_logs/ (2 files)
| File | ID | Date | Summary |
|---|---|---|---|
| shift_log_SHL-2024-0819.txt | SHL-2024-0819 | Aug 2024 | Captures GB-14 rising trend that triggered WO-4471 |
| shift_log_SHL-2026-0121.txt | SHL-2026-0121 | Jan 2026 | Captures third event in real-time; Suresh Kumar connects to 2019 |

### inspections/ (2 files)
| File | ID | Date | Summary |
|---|---|---|---|
| inspection_2021_07_bay4_zone_c.txt | SIR-2021-034 | Jul 2021 | 18-month post-incident review; CA-04 still open |
| inspection_2025_annual_safety_audit.txt | SAR-2025 | Dec 2025 | Explicitly lists 3 open risks that cause Jan 2026 incident |

### oem_manuals/ (1 file)
| File | Equipment | Summary |
|---|---|---|
| oem_manual_GB14_draeger_polytron_ch4.txt | GB-14 | Calibration intervals, pre-failure drift signs, troubleshooting |

### regulatory/ (1 file)
| File | Standard | Summary |
|---|---|---|
| regulatory_oisd_105_hotwork_permit_synthetic.txt | OISD-STD-105 | Hot work permit requirements — Clause 4.1.3, 4.1.4, 6.2.4 map to WO-4892 gaps |

---

## 🔗 Entity Cross-Reference Map

### Equipment Tags
| Tag | Name | Appears In |
|---|---|---|
| GB-14 | Draeger Polytron 2 XP Gas Detector, Bay 4 Zone C | ALL 11 docs |
| HX-11 | Shell-and-tube Heat Exchanger, Train 2, Bay 3 | WO-4471, WO-4476, WO-4892, SHL-2024-0819, SHL-2026-0121, RCA-2026-007 |
| PM-07 | Kirloskar SPP Centrifugal Feed Pump, Bay 2 | WO-4901, SHL-2024-0819, SAR-2025 |
| CR-03 | Demag 20T Overhead Crane, Bay 2 | NMR-2022-031, SHL-2024-0819 |
| PV-08 | Pressure Vessel, Bay 5 | WO-4892, SHL-2026-0121 |
| CV-22 | Control Valve, Unit 7 | SHL-2024-0819, SAR-2025 |

### Key Personnel
| Name | Role | Appears In |
|---|---|---|
| Rajiv Sharma | Maintenance Supervisor | All work orders, shift logs, RCA |
| Anil Mehta | Senior I&E Technician | All calibration WOs, RCA |
| Suresh Kumar | Operator-II (Senior) | NMR-2019, WO-4476, SHL-2024, SHL-2026, NMR-2022, RCA-2026 |
| Priya Nair | HSE Manager (retired Dec 2025) | NMR-2019, SIR-2021, NMR-2022 |
| Kavita Desai | HSE Manager (from Dec 2025) | SAR-2025, WO-4892, RCA-2026 |
| Deepak Singh | Maintenance Engineer | WO-4471, WO-4892, RCA-2026 |
| Mohan Rao | Plant Manager | NMR-2019, SIR-2021, SAR-2025, WO-4892, RCA-2026 |
| Vijay Patil | Operator-II | SHL-2024, NMR-2022 |
| Ganesh Bankar | Crane Operator | NMR-2022 |

### Key Permit Numbers
| Permit | Date | Linked To |
|---|---|---|
| HWP-2019-112 | Mar 2019 | NMR-2019-047 |
| HWP-2024-339 | Aug 2024 | SHL-2024-0819, WO-4471 |
| HWP-2026-018 | Jan 2026 | WO-4892, SHL-2026-0121, RCA-2026-007 |
| HWP-2026-031 | Feb 2026 | WO-4901 |

---

## 🔍 Regulatory Compliance Gaps Mapped

These are the gaps Sentinel's compliance checker should detect when analysing WO-4892 against OISD-STD-105:

| Clause | Requirement | Violation in WO-4892 |
|---|---|---|
| 4.1.3 | Gas reading field cannot be "N/A" | HWP-2026-018 marked "0% — area clear" without time/tester |
| 4.1.4 | Fixed detector >10% LEL blocks permit | No cross-check of GB-14 reading before permit issuance |
| 4.3.2 | Fixed detector reading logged every 30 min | Not done during plasma cutting on 21 Jan 2026 |
| 6.2.4 | Recurring alarm events → procedure review | 3 events over 7 years, no formal review triggered |

---

## 📊 Suggested Graph Schema (Neo4j)

```cypher
(:Document {id, type, date, author, summary})
(:Equipment {tag, name, location, type})
(:Person {name, role})
(:Incident {id, severity, date, location})
(:Regulation {standard, clause, requirement})
(:Permit {number, date, issuer})

(:Document)-[:MENTIONS]->(:Equipment)
(:Document)-[:WRITTEN_BY]->(:Person)
(:Document)-[:REFERENCES]->(:Document)
(:Incident)-[:INVOLVED]->(:Equipment)
(:Document)-[:VIOLATES]->(:Regulation)
(:Incident)-[:PRECEDED_BY]->(:Incident)
(:Permit)-[:ISSUED_BY]->(:Person)
(:Permit)-[:COVERS_AREA_WITH]->(:Equipment)
```

---

## 🌐 Real Data Sources to Add

For a more convincing hackathon corpus, add these publicly available real documents:

### Indian Regulatory Documents (Free, Public)
1. **OISD Standards** — http://oisd.gov.in/standards.php
   - OISD-STD-105: Hot Work (free download)
   - OISD-STD-116: Fire Protection Facilities
   - OISD-STD-144: LPG

2. **DGMS Circulars** — http://dgms.gov.in/circulars
   - Mine safety circulars applicable to heavy industry

3. **Factory Act Schedules** — https://labour.gov.in
   - Schedule I: Notifiable diseases
   - General safety provisions Ch. III

4. **BIS Standards (free preview)** — https://bis.gov.in
   - IS 5572: Classification of hazardous areas

### OEM Manuals (Open Access)
5. **Draeger Product Documentation** — https://www.draeger.com/en_APAC/Applications/Resources/PN-Portal
   - Polytron 2 XP product sheets (free registration)

6. **ABB Industrial Manuals** — https://library.e.abb.com
   - Many instrumentation manuals free with account

7. **Emerson/Fisher Manuals** — https://www.emerson.com/documents
   - Control valve, pressure relief documentation

### Sample Work Order Templates
8. **HSE UK (UK Health & Safety Executive)** — https://www.hse.gov.uk
   - Permit to work examples, hot work guidance (free)
   - These are English-language but structurally applicable

---

## 🏗️ To Expand the Corpus (Suggested 15 More Documents)

These would make the dataset richer if you have time:

- `work_order_WO4102_2022_GB14_sensor_replacement.txt` — Feb 2022 sensor element replacement
- `work_order_WO4198_2021_GB14_calibration.txt` — March 2021 routine calibration
- `work_order_WO4335_2022_hotwork_bay4.txt` — unrelated hot work, no issue
- `work_order_WO4473_2024_GB14_sensor_element.txt` — Nov 2024 sensor element replacement
- `shift_log_SHL-2024-0820.txt` — next shift after WO-4471 (area cleared)
- `shift_log_SHL-2026-0122.txt` — next shift after WO-4892 (repairs in progress)
- `inspection_2022_annual_safety_audit.txt` — mentions CA-04 still open
- `inspection_2023_06_electrical_systems.txt` — GB-17 and GB-22 inspection
- `inspection_2024_Q1_sensors.txt` — all gas detectors, GB-14 calibration due noted
- `incident_2023_11_chemical_spill.txt` — unrelated incident, adds corpus diversity
- `oem_manual_HX11_shell_tube_gaskets.txt` — gasket life and replacement procedures
- `oem_manual_PM07_centrifugal_pump.txt` — bearing vibration thresholds
- `oem_manual_hotwork_permit_system.txt` — general hot work guidance
- `regulatory_factory_act_ch4_safety.txt` — Factories Act safety provisions
- `regulatory_peso_storage_norms.txt` — PESO storage regulations

---

*Corpus prepared for Sentinel hackathon demo — Vindhya Steelworks.*
*All persons, incidents, and work orders are fictional.*
