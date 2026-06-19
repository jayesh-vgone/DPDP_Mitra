"""
Seed DPDP assessment questions for all three institution categories.

Three question sets: school | higher_ed | edtech
Each covers 8 risk categories, 3-5 questions per category.
Total: school=32, higher_ed=32, edtech=35 questions.

Safe to re-run: truncates existing questions first, then re-inserts.
(Questions are not user-editable in v1, so truncate+reinsert is correct.)

Usage (from backend/ directory):
    python scripts/seed_questions.py
"""

import asyncio
from pathlib import Path
import os

import asyncpg
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
DATABASE_URL = os.environ["DATABASE_URL"]

# ---------------------------------------------------------------------------
# Question definitions
#
# Each entry: (category, question_text, dpdp_section, weight, answer_type)
#   answer_type: 'scale' (0-4) | 'boolean' (0 or 4)
#   order_index is assigned automatically (sequential within institution_category)
# ---------------------------------------------------------------------------

SCHOOL_QUESTIONS = [
    # ── 1. Consent Management (Section 6, 7) ──────────────────────────────────
    ("Consent Management",
     "We obtain specific, informed written consent from parents/guardians before collecting student personal data.",
     "Section 6, 7", 1.5, "scale"),
    ("Consent Management",
     "Our consent forms clearly explain what data is collected, why it is collected, and with whom it will be shared.",
     "Section 6", 1.0, "scale"),
    ("Consent Management",
     "We have a documented process for parents/guardians to withdraw consent and we act on withdrawals promptly.",
     "Section 7", 1.0, "scale"),
    ("Consent Management",
     "We obtain separate consent for each distinct purpose of data processing (e.g. academics, extracurriculars, marketing).",
     "Section 6", 1.0, "scale"),

    # ── 2. Data Security (Section 8(5), 8(6)) ─────────────────────────────────
    ("Data Security",
     "Role-based access controls ensure only authorised staff can access student personal data.",
     "Section 8(5)", 1.5, "scale"),
    ("Data Security",
     "Student data is encrypted at rest and in transit (e.g. secure databases, HTTPS for all portals).",
     "Section 8(5)", 1.5, "scale"),
    ("Data Security",
     "We conduct periodic security audits or vulnerability assessments of systems handling student data.",
     "Section 8(5)", 1.0, "scale"),
    ("Data Security",
     "All staff who access student personal data have received data protection training.",
     "Section 8(5)", 1.0, "scale"),

    # ── 3. Vendor / Data Processor Risk (Section 8(2)) ────────────────────────
    ("Vendor / Data Processor Risk",
     "We have signed Data Processing Agreements (DPAs) with all third-party vendors who process student data.",
     "Section 8(2)", 1.5, "scale"),
    ("Vendor / Data Processor Risk",
     "We periodically review vendor compliance with our data protection requirements.",
     "Section 8(2)", 1.0, "scale"),
    ("Vendor / Data Processor Risk",
     "We maintain a register of all vendors and processors who handle student personal data.",
     "Section 8(2)", 1.0, "scale"),
    ("Vendor / Data Processor Risk",
     "Vendor contracts prohibit sub-contracting of data processing without our explicit approval.",
     "Section 8(2)", 1.0, "scale"),

    # ── 4. Data Retention (Section 8(7), 8(8)) ────────────────────────────────
    ("Data Retention",
     "We have a documented data retention policy specifying how long each type of student data is kept.",
     "Section 8(7)", 1.5, "scale"),
    ("Data Retention",
     "Student records are deleted or anonymised once their retention period expires.",
     "Section 8(7)", 1.5, "scale"),
    ("Data Retention",
     "We communicate our data retention periods to parents/guardians.",
     "Section 8(7)", 0.75, "scale"),
    ("Data Retention",
     "Data migrated from legacy systems is also subject to our current retention policy.",
     "Section 8(8)", 0.75, "scale"),

    # ── 5. Children's Data (Section 9) ────────────────────────────────────────
    ("Children's Data",
     "We verify the age of data subjects and apply enhanced protections for all students under 18.",
     "Section 9", 2.0, "scale"),
    ("Children's Data",
     "We never process children's data for behavioural tracking, targeted advertising, or profiling.",
     "Section 9", 2.0, "scale"),
    ("Children's Data",
     "Our school apps and portals display age-appropriate privacy notices understandable to students and parents.",
     "Section 9", 1.0, "scale"),
    ("Children's Data",
     "We have a guardian consent verification mechanism before creating student digital accounts.",
     "Section 9", 1.5, "scale"),

    # ── 6. Breach Readiness (Section 8(6)) ────────────────────────────────────
    ("Breach Readiness",
     "We have a documented incident response plan specifically covering personal data breaches.",
     "Section 8(6)", 1.5, "scale"),
    ("Breach Readiness",
     "A named person is responsible for coordinating our data breach response.",
     "Section 8(6)", 1.0, "boolean"),
    ("Breach Readiness",
     "We can identify affected individuals and notify them within 72 hours of detecting a breach.",
     "Section 8(6)", 1.0, "scale"),
    ("Breach Readiness",
     "We conduct regular drills or simulations to test our breach response capability.",
     "Section 8(6)", 1.0, "scale"),

    # ── 7. Cross-Border Transfer (Section 16) ─────────────────────────────────
    ("Cross-Border Transfer",
     "We know which of our student data storage systems are hosted outside India.",
     "Section 16", 1.5, "scale"),
    ("Cross-Border Transfer",
     "We have verified that any cross-border data transfers comply with Section 16 of the DPDP Act.",
     "Section 16", 1.5, "scale"),
    ("Cross-Border Transfer",
     "Cloud service providers used for student data store data only in permissible jurisdictions.",
     "Section 16", 1.0, "scale"),
    ("Cross-Border Transfer",
     "Contracts with overseas processors require them to protect student data to Indian standards.",
     "Section 16", 1.0, "scale"),

    # ── 8. Grievance Redressal (Section 13) ───────────────────────────────────
    ("Grievance Redressal",
     "We have designated a Data Protection Officer (or equivalent contact) accessible to parents and students.",
     "Section 13", 1.5, "scale"),
    ("Grievance Redressal",
     "We have a published process for parents and students to raise data-related complaints.",
     "Section 13", 1.0, "scale"),
    ("Grievance Redressal",
     "We respond to data grievances within the timeline required by applicable rules.",
     "Section 13", 1.0, "scale"),
    ("Grievance Redressal",
     "We maintain records of all data-related grievances received and their resolutions.",
     "Section 13", 1.0, "scale"),
]

HIGHER_ED_QUESTIONS = [
    # ── 1. Consent Management ─────────────────────────────────────────────────
    ("Consent Management",
     "We obtain clear, specific consent from students before using their personal data for purposes beyond core academic functions.",
     "Section 6, 7", 1.5, "scale"),
    ("Consent Management",
     "We maintain records showing when and how consent was obtained for each student.",
     "Section 6", 1.0, "scale"),
    ("Consent Management",
     "Students can easily withdraw consent and are informed of the implications of doing so.",
     "Section 7", 1.0, "scale"),
    ("Consent Management",
     "We separate consent for academic data from consent for research, marketing, or alumni relations.",
     "Section 6", 1.0, "scale"),

    # ── 2. Data Security ──────────────────────────────────────────────────────
    ("Data Security",
     "Access to student and faculty personal data systems is controlled via role-based permissions.",
     "Section 8(5)", 1.5, "scale"),
    ("Data Security",
     "All institutional systems holding personal data are protected with encryption and regular security patches.",
     "Section 8(5)", 1.5, "scale"),
    ("Data Security",
     "We have a dedicated IT security policy covering student and employee personal data.",
     "Section 8(5)", 1.0, "scale"),
    ("Data Security",
     "We conduct at least annual security assessments of systems that hold personal data.",
     "Section 8(5)", 1.0, "scale"),

    # ── 3. Vendor / Data Processor Risk ───────────────────────────────────────
    ("Vendor / Data Processor Risk",
     "We have DPAs with all EdTech platforms, LMS providers, and cloud services that process student data.",
     "Section 8(2)", 1.5, "scale"),
    ("Vendor / Data Processor Risk",
     "We maintain an inventory of all third-party vendors with access to institutional personal data.",
     "Section 8(2)", 1.0, "scale"),
    ("Vendor / Data Processor Risk",
     "Research collaborators are subject to data protection obligations when handling personal data from our institution.",
     "Section 8(2)", 1.0, "scale"),
    ("Vendor / Data Processor Risk",
     "We audit vendor data protection practices at least annually.",
     "Section 8(2)", 1.0, "scale"),

    # ── 4. Data Retention ─────────────────────────────────────────────────────
    ("Data Retention",
     "We have a published retention schedule covering all data categories (student records, exam data, faculty data).",
     "Section 8(7)", 1.5, "scale"),
    ("Data Retention",
     "Data is deleted or anonymised in accordance with our retention schedule.",
     "Section 8(7)", 1.5, "scale"),
    ("Data Retention",
     "We retain academic records only as long as required by applicable regulatory mandates (UGC, AICTE, etc.).",
     "Section 8(8)", 1.0, "scale"),
    ("Data Retention",
     "We have a process to manage data belonging to alumni, former faculty, and applicants who did not enrol.",
     "Section 8(7)", 0.75, "scale"),

    # ── 5. Children's Data ────────────────────────────────────────────────────
    ("Children's Data",
     "We identify and apply special protections for any students under 18 enrolled in our institution.",
     "Section 9", 1.5, "scale"),
    ("Children's Data",
     "Research activities do not involve behavioural profiling of students under 18 without explicit guardian consent.",
     "Section 9", 1.5, "scale"),
    ("Children's Data",
     "We have controls preventing student data from being used for advertising or marketing targeting.",
     "Section 9", 1.0, "scale"),
    ("Children's Data",
     "Age-appropriate privacy notices are communicated to any minor students in bridging or foundation programmes.",
     "Section 9", 0.75, "scale"),

    # ── 6. Breach Readiness ───────────────────────────────────────────────────
    ("Breach Readiness",
     "We have a formal data breach response procedure documented and accessible to relevant staff.",
     "Section 8(6)", 1.5, "scale"),
    ("Breach Readiness",
     "We have identified the person responsible for notifying authorities in the event of a breach.",
     "Section 8(6)", 1.5, "scale"),
    ("Breach Readiness",
     "We can notify affected students and staff within 72 hours of a confirmed breach.",
     "Section 8(6)", 1.0, "scale"),
    ("Breach Readiness",
     "We conduct breach simulation exercises to test our response capability.",
     "Section 8(6)", 1.0, "scale"),

    # ── 7. Cross-Border Transfer ──────────────────────────────────────────────
    ("Cross-Border Transfer",
     "We know whether any international research partnerships involve transferring personal data outside India.",
     "Section 16", 1.5, "scale"),
    ("Cross-Border Transfer",
     "Cross-border data sharing with international universities or bodies complies with Section 16 requirements.",
     "Section 16", 1.5, "scale"),
    ("Cross-Border Transfer",
     "Our cloud infrastructure (LMS, email, storage) has been assessed for data residency compliance.",
     "Section 16", 1.0, "scale"),
    ("Cross-Border Transfer",
     "We have legal mechanisms in place for any necessary cross-border personal data transfers.",
     "Section 16", 1.0, "scale"),

    # ── 8. Grievance Redressal ────────────────────────────────────────────────
    ("Grievance Redressal",
     "Our institution has a designated contact point for DPDP-related grievances from students and staff.",
     "Section 13", 1.5, "scale"),
    ("Grievance Redressal",
     "We have a published and accessible grievance redressal procedure.",
     "Section 13", 1.0, "scale"),
    ("Grievance Redressal",
     "We resolve data protection grievances within the time periods required by applicable rules.",
     "Section 13", 1.0, "scale"),
    ("Grievance Redressal",
     "We track and report internally on grievances received and how they were resolved.",
     "Section 13", 1.0, "scale"),
]

EDTECH_QUESTIONS = [
    # ── 1. Consent Management ─────────────────────────────────────────────────
    ("Consent Management",
     "Our platform collects informed consent from users before collecting and processing their personal data.",
     "Section 6, 7", 1.5, "scale"),
    ("Consent Management",
     "Consent is granular — users can consent to core features without being forced to consent to optional data uses (analytics, marketing).",
     "Section 6", 1.5, "scale"),
    ("Consent Management",
     "We have a mechanism to re-obtain consent if our data processing purposes change.",
     "Section 7", 1.0, "scale"),
    ("Consent Management",
     "We maintain timestamped consent records for each user in our system.",
     "Section 6", 1.0, "scale"),
    ("Consent Management",
     "Our app's consent flow is prominent, clearly written, and not buried in Terms of Service.",
     "Section 6", 0.75, "scale"),

    # ── 2. Data Security ──────────────────────────────────────────────────────
    ("Data Security",
     "Our platform implements encryption, access controls, and secure APIs appropriate to the sensitivity of the student data we handle.",
     "Section 8(5)", 2.0, "scale"),
    ("Data Security",
     "We follow a secure software development lifecycle (SDLC) including regular security testing before releases.",
     "Section 8(5)", 1.5, "scale"),
    ("Data Security",
     "We conduct penetration testing at least annually on systems handling personal data.",
     "Section 8(5)", 1.0, "scale"),
    ("Data Security",
     "All employees and contractors with access to user data have signed confidentiality agreements.",
     "Section 8(5)", 1.0, "scale"),
    ("Data Security",
     "We have a vulnerability disclosure programme or equivalent mechanism for security researchers.",
     "Section 8(5)", 0.75, "scale"),

    # ── 3. Vendor / Data Processor Risk ───────────────────────────────────────
    ("Vendor / Data Processor Risk",
     "We have DPAs with all third-party SDKs, analytics tools, and cloud providers that receive user personal data.",
     "Section 8(2)", 2.0, "scale"),
    ("Vendor / Data Processor Risk",
     "We have a review and approval process before any new third-party integrations go live.",
     "Section 8(2)", 1.5, "scale"),
    ("Vendor / Data Processor Risk",
     "We maintain an up-to-date data map showing which third parties receive which categories of data.",
     "Section 8(2)", 1.0, "scale"),
    ("Vendor / Data Processor Risk",
     "We have assessed whether any third-party tools or SDKs send personal data outside India.",
     "Section 8(2)", 1.0, "scale"),

    # ── 4. Data Retention ─────────────────────────────────────────────────────
    ("Data Retention",
     "We have a documented data retention policy with defined periods for each data category (user profiles, learning analytics, content logs).",
     "Section 8(7)", 1.5, "scale"),
    ("Data Retention",
     "User accounts and associated data are deleted within a defined period after account closure or deletion request.",
     "Section 8(7)", 1.5, "scale"),
    ("Data Retention",
     "We offer users the ability to download and delete their personal data (data portability and erasure).",
     "Section 8(7)", 1.0, "scale"),
    ("Data Retention",
     "We use automated mechanisms (not manual processes) to enforce our data retention schedule.",
     "Section 8(8)", 1.0, "scale"),

    # ── 5. Children's Data ────────────────────────────────────────────────────
    ("Children's Data",
     "Our platform has age verification mechanisms and applies enhanced protections for all users under 18.",
     "Section 9", 2.0, "scale"),
    ("Children's Data",
     "We do not use student data for behavioural advertising, profiling, or sale to third parties.",
     "Section 9", 2.0, "scale"),
    ("Children's Data",
     "We obtain verifiable parental consent before creating accounts for children and processing their data.",
     "Section 9", 2.0, "scale"),
    ("Children's Data",
     "Our platform complies with Section 9's prohibition on tracking and monitoring of children.",
     "Section 9", 1.5, "scale"),

    # ── 6. Breach Readiness ───────────────────────────────────────────────────
    ("Breach Readiness",
     "We have an incident response plan covering personal data breaches, including roles, timelines, and notification steps.",
     "Section 8(6)", 1.5, "scale"),
    ("Breach Readiness",
     "Our engineering team has runbooks for containing and remediating common breach scenarios.",
     "Section 8(6)", 1.5, "scale"),
    ("Breach Readiness",
     "We can detect a data breach in real time or near real time via monitoring and alerting.",
     "Section 8(6)", 1.5, "scale"),
    ("Breach Readiness",
     "We have practiced our breach response plan through a tabletop exercise in the past 12 months.",
     "Section 8(6)", 1.0, "scale"),

    # ── 7. Cross-Border Transfer ──────────────────────────────────────────────
    ("Cross-Border Transfer",
     "We have a data residency policy specifying where user personal data is stored and processed.",
     "Section 16", 2.0, "scale"),
    ("Cross-Border Transfer",
     "We have assessed all cloud infrastructure and third-party services for compliance with Section 16 cross-border transfer rules.",
     "Section 16", 2.0, "scale"),
    ("Cross-Border Transfer",
     "Where we transfer data outside India, legal mechanisms (e.g. standard contractual clauses) are in place.",
     "Section 16", 1.5, "scale"),
    ("Cross-Border Transfer",
     "We proactively disclose to users which countries their data may be transferred to.",
     "Section 16", 1.0, "scale"),
    ("Cross-Border Transfer",
     "We have validated that our primary cloud provider's India region is a permissible jurisdiction under the DPDP Act.",
     "Section 16", 1.0, "scale"),

    # ── 8. Grievance Redressal ────────────────────────────────────────────────
    ("Grievance Redressal",
     "Our platform provides a clear, accessible in-app mechanism for users to raise data protection complaints.",
     "Section 13", 1.5, "scale"),
    ("Grievance Redressal",
     "We have designated a person responsible for handling DPDP grievances.",
     "Section 13", 1.5, "scale"),
    ("Grievance Redressal",
     "We have defined SLAs for responding to and resolving data protection grievances.",
     "Section 13", 1.0, "scale"),
    ("Grievance Redressal",
     "Our grievance redressal contact details are published in our privacy policy.",
     "Section 13", 1.0, "scale"),
]

ALL_SETS = [
    ("school", SCHOOL_QUESTIONS),
    ("higher_ed", HIGHER_ED_QUESTIONS),
    ("edtech", EDTECH_QUESTIONS),
]


async def run():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Truncate existing questions so re-runs produce a clean slate.
        # Cascade deletes any responses/attempts that referenced old question IDs.
        # This is safe because questions are not user-editable in v1.
        await conn.execute(
            "TRUNCATE TABLE assessment_responses, assessment_questions RESTART IDENTITY CASCADE"
        )

        totals = {}
        for inst_category, questions in ALL_SETS:
            for idx, (category, question_text, dpdp_section, weight, answer_type) in enumerate(questions):
                await conn.execute(
                    """
                    INSERT INTO assessment_questions
                        (institution_category, category, question_text,
                         dpdp_section, weight, order_index, answer_type)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    inst_category,
                    category,
                    question_text,
                    dpdp_section,
                    weight,
                    idx,
                    answer_type,
                )
            totals[inst_category] = len(questions)

        print(f"\n{'='*60}")
        print("  DPDP Mitra -- Assessment Questions Seeded")
        print(f"{'='*60}")
        for cat, count in totals.items():
            print(f"  {cat:12s} : {count} questions")
        print(f"  {'TOTAL':12s} : {sum(totals.values())} questions")
        print(f"{'='*60}\n")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
