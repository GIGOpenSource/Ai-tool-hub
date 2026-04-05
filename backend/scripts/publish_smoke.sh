#!/usr/bin/env bash
# 发布前接口抽样（对应 docs/手册-A-部署安全-发布与运维.md 内验收清单 §2.3），失败则非零退出。
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
BASE_URL="${BASE_URL%/}" # 去掉尾斜杠便于拼接

code() {
  curl -sS -o /dev/null -w "%{http_code}" "$@" || echo "000"
}

echo "publish_smoke: BASE_URL=$BASE_URL"

c0=$(code "${BASE_URL}/api/health")
if [[ "$c0" != "200" ]]; then
  echo "FAIL: GET /api/health 期望 200，实际 $c0"
  exit 1
fi

c1=$(code -X POST "${BASE_URL}/api/submissions/tool" -H "Content-Type: application/json" -d "{}")
if [[ "$c1" != "401" ]]; then
  echo "FAIL: POST /api/submissions/tool 期望 401，实际 $c1"
  exit 1
fi

c2=$(code "${BASE_URL}/api/tools")
if [[ "$c2" != "200" ]]; then
  echo "FAIL: GET /api/tools 期望 200，实际 $c2"
  exit 1
fi

c3=$(code "${BASE_URL}/api/site/frontend_nav")
if [[ "$c3" != "200" ]]; then
  echo "FAIL: GET /api/site/frontend_nav 期望 200，实际 $c3"
  exit 1
fi

c4=$(code "${BASE_URL}/api/seo/robots.txt")
if [[ "$c4" != "200" ]]; then
  echo "FAIL: GET /api/seo/robots.txt 期望 200，实际 $c4"
  exit 1
fi

echo "publish_smoke: OK"
