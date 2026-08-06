import importlib
import os
import sys
import tempfile
import unittest

from fastapi.testclient import TestClient


class TestUnifiedApp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.db_path = os.path.join(cls.temp_dir.name, 'test.db')
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

        os.environ['YILIU_PASSWORD'] = 'test-password'
        os.environ['YILIU_DB'] = cls.db_path
        os.environ['YILIU_SEED'] = os.path.join(cls.temp_dir.name, 'missing-seed.json')
        os.environ['YILIU_WEB_ROOT'] = repo_root

        server_dir = os.path.join(repo_root, 'server')
        sys.path.insert(0, server_dir)
        cls.main = importlib.import_module('main')
        cls.client = TestClient(cls.main.app)
        cls.client.__enter__()

        response = cls.client.post('/api/auth', json={'password': 'test-password'})
        cls.token = response.json()['data']['token']
        cls.auth_headers = {'Authorization': f'Bearer {cls.token}'}

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        cls.temp_dir.cleanup()

    def test_static_routes_do_not_shadow_api(self):
        self.assertEqual(self.client.get('/').status_code, 200)
        self.assertEqual(self.client.get('/api/health').json(), {'status': 'ok'})
        self.assertEqual(self.client.get('/src/app.js').status_code, 200)
        self.assertEqual(self.client.get('/icons/icon-192.png').status_code, 200)
        self.assertEqual(self.client.get('/server/main.py').status_code, 404)

    def test_authentication(self):
        self.assertEqual(
            self.client.post('/api/auth', json={'password': 'wrong'}).status_code,
            403,
        )
        self.assertEqual(self.client.get('/api/bookmarks').status_code, 401)
        self.assertEqual(
            self.client.get('/api/bookmarks', headers=self.auth_headers).status_code,
            200,
        )

    def test_bookmark_crud_and_duplicate_url(self):
        payload = {
            'name': 'Test Bookmark',
            'url': 'https://test.example.com',
            'grp': 'Test',
            'description': 'integration test',
            'tags': ['test'],
            'is_pinned': True,
        }
        created = self.client.post('/api/bookmarks', json=payload, headers=self.auth_headers)
        self.assertEqual(created.status_code, 200)
        bookmark_id = created.json()['data']['id']

        duplicate = self.client.post('/api/bookmarks', json=payload, headers=self.auth_headers)
        self.assertEqual(duplicate.status_code, 409)

        listed = self.client.get('/api/bookmarks', headers=self.auth_headers).json()['data']
        bookmark = next(item for item in listed if item['id'] == bookmark_id)
        self.assertEqual(bookmark['description'], 'integration test')
        self.assertEqual(bookmark['tags'], ['test'])
        self.assertTrue(bookmark['is_pinned'])

        updated = self.client.put(
            f'/api/bookmarks/{bookmark_id}',
            json={'name': 'Updated Bookmark'},
            headers=self.auth_headers,
        )
        self.assertEqual(updated.status_code, 200)

        deleted = self.client.delete(
            f'/api/bookmarks/{bookmark_id}',
            headers=self.auth_headers,
        )
        self.assertEqual(deleted.status_code, 200)

    def test_import_reports_inserted_skipped_and_errors(self):
        payload = {
            'bookmarks': [
                {'name': 'Imported', 'url': 'https://import.example.com'},
                {'name': 'Imported duplicate', 'url': 'https://import.example.com'},
                {'name': 'Missing URL'},
            ]
        }
        response = self.client.post(
            '/api/bookmarks/import',
            json=payload,
            headers=self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()['data']
        self.assertEqual(result['inserted'], 1)
        self.assertEqual(result['skipped'], 1)
        self.assertEqual([error['index'] for error in result['errors']], [2])


if __name__ == '__main__':
    unittest.main()