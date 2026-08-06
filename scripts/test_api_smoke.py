import os
import sys
import unittest
import urllib.request
import urllib.error
import json

BASE_URL = os.getenv('TEST_BASE_URL', '').rstrip('/')
PASSWORD = os.getenv('YILIU_PASSWORD')

class TestApiSmoke(unittest.TestCase):
    token = None

    @classmethod
    def setUpClass(cls):
        if not BASE_URL or not PASSWORD:
            raise unittest.SkipTest('需要通过 TEST_BASE_URL 和 YILIU_PASSWORD 提供测试目标')

    def _request(self, path, method='GET', payload=None, use_auth=False):
        url = f"{BASE_URL}{path}"
        headers = {'Content-Type': 'application/json'}
        if use_auth and self.token:
            headers['Authorization'] = f"Bearer {self.token}"

        data = json.dumps(payload).encode('utf-8') if payload else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                body = resp.read().decode('utf-8')
                return resp.status, json.loads(body) if body and resp.headers.get_content_type() == 'application/json' else body
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8')
            return e.code, json.loads(body) if body and e.headers.get_content_type() == 'application/json' else body

    def test_01_static_and_health(self):
        status, body = self._request('/')
        self.assertEqual(status, 200)
        self.assertIn('<!doctype html>', body.lower())

        status, body = self._request('/api/health')
        self.assertEqual(status, 200)
        self.assertEqual(body.get('status'), 'ok')

    def test_02_auth(self):
        status, body = self._request('/api/auth', method='POST', payload={'password': 'wrong-password'})
        self.assertEqual(status, 403)

        status, body = self._request('/api/auth', method='POST', payload={'password': PASSWORD})
        self.assertEqual(status, 200)
        self.assertIn('token', body.get('data', {}))
        TestApiSmoke.token = body['data']['token']

    def test_03_bookmarks_crud(self):
        # 未授权
        status, _ = self._request('/api/bookmarks', method='GET', use_auth=False)
        self.assertEqual(status, 401)

        # 正常获取
        status, body = self._request('/api/bookmarks', method='GET', use_auth=True)
        self.assertEqual(status, 200)
        self.assertIn('data', body)

        # 创建书签
        new_bm = {
            "name": "Smoke Test Bookmark",
            "url": "https://smoke-test.example.com",
            "grp": "Test",
            "icon": ""
        }
        status, body = self._request('/api/bookmarks', method='POST', payload=new_bm, use_auth=True)
        if status == 409:
            self.fail('测试书签已存在，请先清理 https://smoke-test.example.com')
        self.assertEqual(status, 200)
        bm_id = body.get('data', {}).get('id')
        self.assertIsNotNone(bm_id)

        # 重复 URL 校验
        status, _ = self._request('/api/bookmarks', method='POST', payload=new_bm, use_auth=True)
        self.assertEqual(status, 409)

        # 删除书签
        status, _ = self._request(f'/api/bookmarks/{bm_id}', method='DELETE', use_auth=True)
        self.assertEqual(status, 200)

if __name__ == '__main__':
    unittest.main()