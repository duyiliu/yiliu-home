FROM python:3.14-slim

WORKDIR /app

# 依赖安装
COPY server/requirements.txt ./server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

# 后端代码
COPY server/main.py ./server/main.py
COPY server/seed.json ./seed.json

# 前端资产（供 FastAPI StaticFiles 托管）
COPY index.html styles.css manifest.json sw.js nav.html index-v2.html ./
COPY icons ./icons
COPY src ./src

ENV YILIU_WEB_ROOT=/app
WORKDIR /app/server

EXPOSE 18090
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "18090"]