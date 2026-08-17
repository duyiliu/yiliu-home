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
        self.assertEqual(self.client.get('/auth.js').status_code, 200)
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


    def test_bootstrap_requires_auth(self):
        self.assertEqual(self.client.get('/api/bootstrap').status_code, 401)

    def test_bootstrap_returns_all_sections(self):
        response = self.client.get('/api/bootstrap', headers=self.auth_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()['data']
        for key in ('bookmarks', 'tasks', 'habits', 'note'):
            self.assertIn(key, data)
        self.assertEqual(data['note']['key'], 'scratch')
        self.assertIsInstance(data['bookmarks'], list)
        self.assertIsInstance(data['tasks'], list)
        self.assertIsInstance(data['habits'], list)

    def test_task_crud_and_clear_completed(self):
        self.assertEqual(self.client.get('/api/tasks').status_code, 401)

        created = self.client.post(
            '/api/tasks',
            json={'title': 'Task A', 'priority': 'high', 'tags': ['dev'], 'due_date': '2026-08-10'},
            headers=self.auth_headers,
        )
        self.assertEqual(created.status_code, 200)
        task = created.json()['data']
        self.assertEqual(task['title'], 'Task A')
        self.assertEqual(task['priority'], 'high')
        self.assertEqual(task['status'], 'todo')
        self.assertEqual(task['tags'], ['dev'])
        tid = task['id']

        updated = self.client.put(
            f'/api/tasks/{tid}',
            json={'status': 'done'},
            headers=self.auth_headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()['data']['status'], 'done')
        self.assertIsNotNone(updated.json()['data']['completed_at'])

        second = self.client.post('/api/tasks', json={'title': 'Task B'}, headers=self.auth_headers).json()['data']
        self.client.put(f"/api/tasks/{second['id']}", json={'status': 'done'}, headers=self.auth_headers)

        cleared = self.client.delete('/api/tasks/completed', headers=self.auth_headers)
        self.assertEqual(cleared.status_code, 200)
        self.assertEqual(cleared.json()['data']['deleted'], 2)

        remaining = self.client.get('/api/tasks', headers=self.auth_headers).json()['data']
        self.assertEqual(remaining, [])

        self.assertEqual(self.client.delete('/api/tasks/999999', headers=self.auth_headers).status_code, 404)

    def test_habit_check_and_uncheck(self):
        created = self.client.post(
            '/api/habits',
            json={'title': 'Habit A', 'description': 'daily run'},
            headers=self.auth_headers,
        )
        self.assertEqual(created.status_code, 200)
        hid = created.json()['data']['id']

        for day in ('2026-08-05', '2026-08-06', '2026-08-07'):
            response = self.client.post(
                f'/api/habits/{hid}/check',
                json={'checked': True, 'date': day},
                headers=self.auth_headers,
            )
            self.assertEqual(response.status_code, 200)

        # 重复打卡不产生重复记录
        response = self.client.post(
            f'/api/habits/{hid}/check',
            json={'checked': True, 'date': '2026-08-07'},
            headers=self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['data']['history'].count('2026-08-07'), 1)

        # 取消打卡
        response = self.client.post(
            f'/api/habits/{hid}/check',
            json={'checked': False, 'date': '2026-08-07'},
            headers=self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('2026-08-07', response.json()['data']['history'])

        listed = self.client.get('/api/habits', headers=self.auth_headers).json()['data']
        habit = next(h for h in listed if h['id'] == hid)
        self.assertEqual(habit['history'], ['2026-08-05', '2026-08-06'])
        self.assertEqual(habit['streak'], 2)

        self.assertEqual(
            self.client.post(
                f'/api/habits/{hid}/check',
                json={'checked': True},
                headers=self.auth_headers,
            ).status_code,
            200,
        )  # 无 date 默认今天

        deleted = self.client.delete(f'/api/habits/{hid}', headers=self.auth_headers)
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(self.client.get('/api/habits', headers=self.auth_headers).json()['data'], [])
        self.assertEqual(self.client.post('/api/habits/999999/check', json={'checked': True}, headers=self.auth_headers).status_code, 404)

    def test_note_get_and_update(self):
        self.assertEqual(self.client.get('/api/note').status_code, 401)

        response = self.client.get('/api/note', headers=self.auth_headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['data']['key'], 'scratch')

        updated = self.client.put('/api/note', json={'content': 'hello 便签'}, headers=self.auth_headers)
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()['data']['content'], 'hello 便签')

        fetched = self.client.get('/api/note', headers=self.auth_headers)
        self.assertEqual(fetched.json()['data']['content'], 'hello 便签')


if __name__ == '__main__':
    unittest.main()