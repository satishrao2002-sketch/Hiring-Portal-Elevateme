"""Curated, factual public content for ElevateMe's search/AI discovery layer.
No fabricated statistics: role descriptions are general knowledge; salary ranges
are derived from roles currently on the ElevateMe platform (see /methodology)."""

CAREERS = {
    "data-analyst": {
        "slug": "data-analyst", "title": "Data Analyst",
        "answer": "A Data Analyst collects, cleans and interprets data to help organizations make decisions. They write SQL queries, build dashboards and reports, and translate business questions into measurable insights using tools like SQL, Python, Excel and BI platforms such as Power BI or Tableau.",
        "responsibilities": ["Write SQL to extract and transform data", "Build dashboards and recurring reports", "Analyze trends and communicate findings to stakeholders", "Define and track KPIs", "Ensure data quality and consistency"],
        "core_skills": ["SQL", "Python", "Power BI", "Tableau", "Excel"],
        "education": "Typically a bachelor's degree in a quantitative field; many analysts also hold a master's in analytics, statistics or business analytics.",
        "path": ["Junior Data Analyst", "Data Analyst", "Senior Data Analyst", "Analytics Lead / BI Manager"],
        "interview_topics": ["SQL joins and window functions", "Dashboard design and storytelling", "A/B testing and metrics", "Case studies on business problems"],
        "related_careers": ["business-analyst", "bi-analyst", "data-scientist"],
    },
    "bi-analyst": {
        "slug": "bi-analyst", "title": "BI Analyst",
        "answer": "A Business Intelligence (BI) Analyst designs and maintains the dashboards, data models and reporting that a business runs on. They focus on turning raw data into reliable, self-serve reporting using tools like Power BI, Tableau and SQL so teams can monitor performance.",
        "responsibilities": ["Build and maintain BI dashboards", "Model data for reporting", "Automate recurring reports", "Partner with teams on metrics definitions", "Monitor data reliability"],
        "core_skills": ["Power BI", "SQL", "Tableau", "Excel", "Data Modeling"],
        "education": "A bachelor's degree in business, statistics, information systems or a related field is common.",
        "path": ["BI Analyst", "Senior BI Analyst", "BI Developer", "Analytics Manager"],
        "interview_topics": ["Dimensional modeling", "DAX / calculated measures", "Dashboard performance", "Stakeholder requirements"],
        "related_careers": ["data-analyst", "business-analyst", "data-scientist"],
    },
    "business-analyst": {
        "slug": "business-analyst", "title": "Business Analyst",
        "answer": "A Business Analyst bridges business needs and technical solutions. They gather requirements, map processes, and translate stakeholder goals into clear specifications, often supporting analytics, product or systems teams with documentation, analysis and prioritization.",
        "responsibilities": ["Gather and document requirements", "Map and improve business processes", "Analyze data to support decisions", "Coordinate across stakeholders", "Support solution delivery"],
        "core_skills": ["Requirements Analysis", "SQL", "Excel", "Tableau", "Communication"],
        "education": "A bachelor's degree in business, information systems, economics or a related field is typical.",
        "path": ["Business Analyst", "Senior Business Analyst", "Product Analyst / Product Owner", "Analytics or Product Manager"],
        "interview_topics": ["Requirements elicitation", "Process mapping", "Stakeholder management", "Prioritization frameworks"],
        "related_careers": ["data-analyst", "bi-analyst"],
    },
    "data-scientist": {
        "slug": "data-scientist", "title": "Data Scientist",
        "answer": "A Data Scientist builds statistical and machine-learning models to predict outcomes and uncover patterns. They combine strong programming (usually Python), statistics and domain knowledge to design experiments, train models and deliver measurable business impact.",
        "responsibilities": ["Design experiments and analyses", "Build and evaluate ML models", "Engineer features from raw data", "Communicate model results", "Collaborate with engineering to deploy models"],
        "core_skills": ["Python", "ML", "SQL", "PyTorch", "Statistics"],
        "education": "Often a master's or PhD in a quantitative field, though strong portfolios can substitute for advanced degrees in some roles.",
        "path": ["Junior Data Scientist", "Data Scientist", "Senior Data Scientist", "ML / Research Lead"],
        "interview_topics": ["Statistics and probability", "Model selection and validation", "Feature engineering", "ML system design"],
        "related_careers": ["data-analyst", "ml-engineer"],
    },
    "backend-engineer": {
        "slug": "backend-engineer", "title": "Backend Engineer",
        "answer": "A Backend Engineer builds the servers, APIs and data layers that power applications. They design reliable, scalable services — commonly with languages like Python and frameworks like FastAPI — and work with databases such as PostgreSQL and cloud platforms like AWS.",
        "responsibilities": ["Design and build APIs and services", "Model and query databases", "Ensure scalability and reliability", "Write tests and handle deployments", "Collaborate with frontend and product teams"],
        "core_skills": ["Python", "FastAPI", "PostgreSQL", "AWS", "Docker"],
        "education": "A bachelor's degree in computer science or equivalent experience; bootcamp graduates and self-taught engineers with strong portfolios are common.",
        "path": ["Junior Backend Engineer", "Backend Engineer", "Senior Backend Engineer", "Staff / Principal Engineer"],
        "interview_topics": ["Data structures and algorithms", "API and system design", "Databases and query optimization", "Concurrency and reliability"],
        "related_careers": ["frontend-engineer", "devops-engineer", "ml-engineer"],
    },
}

SKILLS = {
    "sql": {"slug": "sql", "name": "SQL", "answer": "SQL (Structured Query Language) is the standard language for querying and managing relational databases. It is the single most requested skill for data and analytics roles, used to extract, join, filter and aggregate data.", "used_for": ["Data analysis", "Reporting and dashboards", "Backend data access", "Data engineering"], "roles": ["data-analyst", "bi-analyst", "data-scientist", "backend-engineer"], "learn": ["Practice joins, aggregations and window functions", "Build queries against a real dataset", "Learn query optimization basics"]},
    "python": {"slug": "python", "name": "Python", "answer": "Python is a versatile programming language widely used across data analysis, machine learning and backend development. Its readable syntax and rich ecosystem (pandas, scikit-learn, FastAPI) make it a foundational skill for technical roles.", "used_for": ["Data analysis", "Machine learning", "Automation", "Backend development"], "roles": ["data-analyst", "data-scientist", "backend-engineer"], "learn": ["Master pandas for data manipulation", "Build a small end-to-end project", "Learn testing and clean code practices"]},
    "power-bi": {"slug": "power-bi", "name": "Power BI", "answer": "Power BI is Microsoft's business intelligence platform for building interactive dashboards and reports. Analysts use it to model data, write DAX measures and share self-serve reporting across an organization.", "used_for": ["Dashboards", "Business reporting", "Data modeling"], "roles": ["data-analyst", "bi-analyst", "business-analyst"], "learn": ["Learn data modeling and relationships", "Practice DAX measures", "Design clear, performant dashboards"]},
    "tableau": {"slug": "tableau", "name": "Tableau", "answer": "Tableau is a leading data visualization platform used to explore data and build interactive dashboards. It is popular in analytics and BI roles for its drag-and-drop visual analysis.", "used_for": ["Data visualization", "Dashboards", "Exploratory analysis"], "roles": ["data-analyst", "bi-analyst", "business-analyst"], "learn": ["Learn calculated fields and LODs", "Build a portfolio dashboard", "Practice visual best practices"]},
    "fastapi": {"slug": "fastapi", "name": "FastAPI", "answer": "FastAPI is a modern, high-performance Python web framework for building APIs. It offers automatic validation and documentation and is widely used for backend services and ML model serving.", "used_for": ["REST APIs", "Backend services", "ML model serving"], "roles": ["backend-engineer", "ml-engineer"], "learn": ["Build a CRUD API", "Learn async and dependency injection", "Add auth and tests"]},
    "aws": {"slug": "aws", "name": "AWS", "answer": "Amazon Web Services (AWS) is the most widely adopted cloud platform. Engineers use it to deploy, scale and operate applications and data pipelines using services like EC2, S3, RDS and Lambda.", "used_for": ["Cloud infrastructure", "Deployment", "Data pipelines"], "roles": ["backend-engineer", "devops-engineer", "data-scientist"], "learn": ["Learn core services (S3, EC2, IAM)", "Deploy a small app", "Practice infrastructure-as-code"]},
    "react": {"slug": "react", "name": "React", "answer": "React is a JavaScript library for building user interfaces. It is the most in-demand frontend skill, used to build interactive, component-based web applications.", "used_for": ["Web UIs", "Single-page apps", "Design systems"], "roles": ["frontend-engineer"], "learn": ["Master hooks and state", "Build a component library", "Learn routing and data fetching"]},
}

# order of location keys used for listing
LOCATIONS = {
    "chicago-il": {"slug": "chicago-il", "name": "Chicago, IL", "match": "chicago"},
    "austin-tx": {"slug": "austin-tx", "name": "Austin, TX", "match": "austin"},
    "new-york-ny": {"slug": "new-york-ny", "name": "New York, NY", "match": "new york"},
    "boston-ma": {"slug": "boston-ma", "name": "Boston, MA", "match": "boston"},
    "remote": {"slug": "remote", "name": "Remote (U.S.)", "match": "remote"},
}

MARKET_REPORTS = {
    "us-entry-level-tech-hiring": {
        "slug": "us-entry-level-tech-hiring", "title": "U.S. Entry-Level Tech Hiring: What Employers Ask For",
        "summary": "An analysis of the skills and signals employers request most for entry-level and early-career technology roles on ElevateMe.",
        "answer": "Across entry-level technology roles on ElevateMe, the most consistently requested skills are SQL, Python and a business-intelligence tool (Power BI or Tableau) for analytics roles, and Python, a web framework and a cloud platform for engineering roles. Employers increasingly weight verified evidence — projects, assessments and portfolios — over self-reported skill lists.",
        "findings": ["SQL is the single most requested skill for analytics roles", "Verified project evidence strongly influences shortlisting", "Interview readiness is a common gap for early-career candidates", "Hybrid and remote roles broaden the candidate pool"],
        "methodology": "Aggregated, privacy-safe signals derived from roles and profiles on the ElevateMe platform. Figures are illustrative of the current platform and not a national statistical survey.",
    },
}
