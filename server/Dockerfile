FROM python:3.14-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY seed.json .

EXPOSE 18090
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "18090"]
