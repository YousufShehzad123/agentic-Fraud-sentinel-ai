FROM python:3.11-slim

WORKDIR /app

# Install system deps for numpy/scikit-learn wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY backend/ .

# Create db directory
RUN mkdir -p /app/data

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
