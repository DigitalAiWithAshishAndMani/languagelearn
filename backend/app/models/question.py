from sqlalchemy import Column, Integer, String, Text, JSON
from app.core.database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    language = Column(String, nullable=False, index=True)       # python | java | cpp | javascript
    difficulty = Column(String, nullable=False, index=True)     # beginner | intermediate | advanced
    topic = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)                        # theory | coding
    content = Column(Text, nullable=False)
    reference_answer = Column(Text, nullable=True)
    test_cases = Column(JSON, nullable=True)                     # list of {stdin, expected_output}
    tags = Column(JSON, nullable=True)                           # list of tag strings
