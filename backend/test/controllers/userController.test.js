const assert = require('assert');
const { UserController } = require('../../node_app/controllers/userController');
const { constructorOptionsMock, reqMock } = require('../resources/testUtility');

describe('UserController', function () {
	describe('#getInternalUsers', () => {
		const opts = {
			...constructorOptionsMock,
			dataApi: {},
		};

		it('return all internal users', async (done) => {
			const internalUsers = [{ id: 1, username: 'Test' }];
			const internalUserTracking = {
				findAll() {
					return Promise.resolve(internalUsers);
				},
			};

			const newOpts = {
				...opts,
				internalUserTracking,
			};

			const target = new UserController(newOpts);

			const req = {
				...reqMock,
				body: {
					username: 'hashMe',
				},
			};

			let resCode;
			let resMsg;

			const res = {
				status(code) {
					resCode = code;
					return this;
				},
				send(msg) {
					resMsg = msg;
				},
			};

			const expected = [{ id: 1, username: 'Test' }];
			try {
				await target.getInternalUsers(req, res);
				assert.deepStrictEqual(resMsg, expected);
				done();
			} catch (e) {
				assert.fail(e);
				done(e);
			}
		});
	});

	describe('#deleteInternalUser', () => {
		const opts = {
			...constructorOptionsMock,
			dataApi: {},
		};

		it('return all internal users', async () => {
			const internalUsers = [{ id: 1, username: 'Test' }];
			const internalUserTracking = {
				destroy(data) {
					let index = -1;
					internalUsers.forEach((user, index) => {
						if (user.id === data.where.id) {
							index = index;
						}
					});
					internalUsers.splice(index, 1);
					Promise.resolve(index !== -1);
				},
			};

			const newOpts = {
				...opts,
				internalUserTracking,
			};

			const target = new UserController(newOpts);

			const req = {
				...reqMock,
				body: {
					username: 'hashMe',
				},
			};

			let resCode;
			let resMsg;

			const res = {
				status(code) {
					resCode = code;
					return this;
				},
				send(msg) {
					resMsg = msg;
				},
			};

			const expected = [];
			try {
				await target.deleteInternalUser(req, res);
			} catch (e) {
				assert.fail(e);
			}
			assert.deepStrictEqual(internalUsers, expected);
		});
	});

	describe('#getUserDataByIDs', () => {
		let users = [
			{ id: 4, first_name: 'Testerson', last_name: 'Testerson', email: 'testerson@test.com' },
			{ id: 19, first_name: 'Test', last_name: 'Testman', email: 'testman@test.com' },
			{ id: 20, first_name: 'Test', last_name: 'Testinski', email: 'testinski@test.com' },
		];
		const opts = {
			...constructorOptionsMock,
			dataApi: {},
			user: {
				findAll(data) {
					const ids = data.where[Symbol.for('or')];
					const results = ids.map((idObj) => {
						return users.find((user) => user.id === idObj.id);
					});
					return Promise.resolve(results);
				},
			},
			constants: { GAME_CHANGER_OPTS: { index: 'gamechanger' } },
		};
		it('should return users by ids', async (done) => {
			const target = new UserController(opts);

			const req = {
				...reqMock,
				query: {
					ids: '[4,19]',
				},
			};

			let resCode;
			let resMsg;

			const res = {
				status(code) {
					resCode = code;
					return this;
				},
				send(msg) {
					resMsg = msg;
					return this;
				},
			};

			await target.getUserDataByIDs(req, res);
			const expected = {
				users: [
					{ id: 4, first_name: 'Testerson', last_name: 'Testerson', email: 'testerson@test.com' },
					{ id: 19, first_name: 'Test', last_name: 'Testman', email: 'testman@test.com' },
				],
			};
			assert.deepStrictEqual(resMsg, expected);
			done();
		});
	});

	describe('#getUserData', () => {
		let users = [];
		const opts = {
			...constructorOptionsMock,
			dataApi: {},
			user: {
				findOrCreate(data) {
					let user;

					users.forEach((tmpUser) => {
						if (tmpUser.user_id === data.where.user_id) {
							user = tmpUser;
						}
					});

					if (user) {
						return Promise.resolve([user, false]);
					} else {
						user = {
							user_id: data.defaults.user_id,
							notifications: {},
						};
						users.push(user);

						return Promise.resolve([user, true]);
					}
				},
				findOne(data) {
					let user;

					users.forEach((tmpUser) => {
						if (tmpUser.user_id === data.where.user_id) {
							user = tmpUser;
						}
					});

					if (user) {
						return Promise.resolve(user);
					} else {
						return Promise.resolve(undefined);
					}
				},
			},
			constants: { GAME_CHANGER_OPTS: { index: 'gamechanger' } },
		};

		it('should return fake user data for a new user', async (done) => {
			users = [];
			const target = new UserController(opts);

			const req = {
				...reqMock,
				body: {
					username: 'hashMe',
				},
			};

			let resCode;
			let resMsg;

			const res = {
				status(code) {
					resCode = code;
					return this;
				},
				send(msg) {
					resMsg = msg;
					return this;
				},
			};

			try {
				await target.getUserData(req, res);
				const expected = {
					api_key: '',
					export_history: [],
					pdf_opened: [],
					favorite_documents: [],
					favorite_searches: [],
					notifications: {},
					search_history: [],
					user_id: 'testsuite',
				};
				assert.deepStrictEqual(resMsg, expected);
				done();
			} catch (e) {
				assert.fail(e);
				done(e);
			}
		});

		it('should return fake user data for a user', async (done) => {
			users.push({
				user_id: 'testsuite',
				notifications: { gamechanger: { total: 0, favorites: 0, history: 0 } },
			});

			const favorite_documents = [
				{
					id: 1,
					user_id: 'testsuite',
					filename: 'Test',
					favorite_name: 'Test',
					favorite_summary: 'Test',
					search_text: 'Test',
					is_clone: false,
					clone_index: 'Test',
				},
			];

			const favorite_searches = [
				{
					id: 1,
					user_id: 'testsuite',
					search_name: 'Test',
					search_summary: 'Test',
					search_text: 'Test',
					tiny_url: 'gamechanger?tiny=24',
					document_count: 5,
					updated_results: false,
					run_by_cache: false,
				},
			];

			const favorite_topics = [
				{
					id: 1,
					user_id: 'testsuite',
					topic_name: 'Test',
					topic_summary: 'Test',
					is_clone: false,
					clone_index: 'Test',
				},
			];

			const favorite_organizations = [
				{
					id: 1,
					user_id: 'testsuite',
					organization_name: 'Test',
					organization_summary: 'Test',
					is_clone: false,
					clone_index: 'Test',
				},
			];

			const favorite_groups = [
				{
					id: 1,
					user_id: 'testsuite',
					group_type: 'document',
					group_name: 'Test',
					group_description: 'Test',
					is_clone: true,
					clone_index: 'Test',
				},
			];

			const favorite_documents_groups = [
				{
					user_id: 'testsuite',
					favorite_group_id: 1,
					favorite_document_id: 1,
				},
			];

			const search_hisotry = [
				{
					id: 1,
					user_id: 'testsuite',
					clone_name: 'Test',
					search: 'Test',
					num_results: 20,
					had_error: false,
					run_at: 'Test',
					completion_time: 'Test',
					search_type: 'Test',
					cached_result: false,
					is_tutorial_search: false,
					tiny_url: 'gamechanger?tiny=24',
					request_body: {},
					search_version: 1,
				},
			];

			const export_history = [
				{
					id: 1,
					user_id: 'testsuite',
					download_request_body: {},
					search_response_metadata: {},
				},
			];

			const api_key = 'testAPIKey';

			let returnFavoriteDocuments = [];
			let returnFavoriteSearches = [];
			let returnFavoriteTopics = [];
			let returnGCHistory = [];
			let returnExportHistory = [];
			const new_opts = {
				...opts,
				constants: {
					GAMECHANGER_ELASTIC_SEARCH_OPTS: { index: 'Test', legislation_index: 'Test', assist_index: 'Test' },
				},
				externalAPI: {
					getAPIKey(user) {
						return api_key;
					},
				},
				appStats: {
					getUserLastOpened(user) {
						return [
							{
								document: 'test1.pdf',
								documenttime: '2022-03-17T13:54:58.000Z',
								clone_name: 'gamechanger',
							},
							{
								document: 'test2.pdf',
								documenttime: '2022-03-17T13:54:57.000Z',
								clone_name: 'gamechanger',
							},
						];
					},
				},
				dataApi: {
					queryElasticSearch(data) {
						return Promise.resolve({
							body: {
								hits: {
									hits: [
										{
											_source: { download_url_s: 'Test' },
											fields: {
												filename: ['Test'],
												summary_30: ['Test'],
												title: ['Test'],
												doc_type: ['Test'],
												doc_num: ['Test'],
												id: ['Test'],
											},
										},
									],
								},
							},
						});
					},
				},
				search: {
					convertTiny(data) {
						return Promise.resolve({ url: 'Test' });
					},
				},
				favoriteDocument: {
					sequelize: {
						fn(data) {},
						col(data) {},
					},
					findAll(data) {
						if (data.hasOwnProperty('attributes')) {
							let count = 0;
							favorite_documents.forEach((favorite) => {
								if (data.where.filename === favorite.filename) {
									count += 1;
								}
							});
							return Promise.resolve([{ favorited_count: count }]);
						} else {
							returnFavoriteDocuments = [];
							favorite_documents.forEach((favorite) => {
								if (data.where.user_id === favorite.user_id) {
									returnFavoriteDocuments.push(favorite);
								}
							});
							return Promise.resolve(returnFavoriteDocuments);
						}
					},
				},
				favoriteSearch: {
					sequelize: {
						fn(data) {},
						col(data) {},
					},
					findAll(data) {
						if (data.hasOwnProperty('attributes')) {
							let count = 0;
							favorite_searches.forEach((search) => {
								if (data.where.tiny_url === search.tiny_url) {
									count += 1;
								}
							});
							return Promise.resolve([{ favorited_count: count }]);
						} else {
							returnFavoriteSearches = [];
							favorite_searches.forEach((search) => {
								if (data.where.user_id === search.user_id) {
									favorite_searches.push(search);
								}
							});
							return Promise.resolve(returnFavoriteSearches);
						}
					},
				},
				favoriteTopic: {
					sequelize: {
						fn(data) {},
						col(data) {},
					},
					findAll(data) {
						if (data.hasOwnProperty('attributes')) {
							let count = 0;
							favorite_topics.forEach((topic) => {
								if (data.where.topic_name === topic.topic_name) {
									count += 1;
								}
							});
							return Promise.resolve([{ favorited_count: count }]);
						} else {
							returnFavoriteTopics = [];
							favorite_topics.forEach((topic) => {
								if (data.where.user_id === topic.user_id) {
									returnFavoriteTopics.push(topic);
								}
							});
							return Promise.resolve(returnFavoriteTopics);
						}
					},
				},
				favoriteOrganization: {
					sequelize: {
						fn(data) {},
						col(data) {},
					},
					findAll(data) {
						if (data.hasOwnProperty('attributes')) {
							let count = 0;
							favorite_organizations.forEach((org) => {
								if (data.where.organization_name === org.organization_name) {
									count += 1;
								}
							});
							return Promise.resolve([{ favorited_count: count }]);
						} else {
							const returnFavoriteOrganizations = [];
							favorite_organizations.forEach((org) => {
								if (data.where.user_id === org.user_id) {
									returnFavoriteOrganizations.push(org);
								}
							});
							return Promise.resolve(returnFavoriteOrganizations);
						}
					},
				},
				favoriteGroup: {
					sequelize: {
						fn(data) {},
						col(data) {},
					},
					findAll(data) {
						const returnFavoriteGroups = [];
						favorite_groups.forEach((group) => {
							if (data.where.user_id === group.user_id) {
								returnFavoriteGroups.push(group);
							}
						});
						return Promise.resolve(returnFavoriteGroups);
					},
				},
				favoriteDocumentsGroup: {
					sequelize: {
						fn(data) {},
						col(data) {},
					},
					findAll(data) {
						const returnFavoriteDocumentsGroup = [];
						favorite_documents_groups.forEach((docGroup) => {
							if (data.where.favorite_group_id === docGroup.favorite_group_id) {
								returnFavoriteDocumentsGroup.push(docGroup);
							}
						});
						return Promise.resolve(returnFavoriteDocumentsGroup);
					},
				},
				gcHistory: {
					findAll(data) {
						returnGCHistory = [];
						search_hisotry.forEach((search) => {
							if (data.where.user_id === search.user_id) {
								returnGCHistory.push(search);
							}
						});
						return Promise.resolve(returnGCHistory);
					},
				},
				exportHistory: {
					findAll(data) {
						returnExportHistory = [];
						export_history.forEach((history) => {
							if (data.where.user_id === history.user_id) {
								returnExportHistory.push(history);
							}
						});
						return Promise.resolve(returnExportHistory);
					},
				},
			};

			const target = new UserController(new_opts);

			const req = {
				...reqMock,
				body: {
					username: 'hashMe',
				},
			};

			let resCode;
			let resMsg;

			const res = {
				status(code) {
					resCode = code;
					return this;
				},
				send(msg) {
					resMsg = msg;
				},
			};

			try {
				await target.getUserData(req, res);
				const expected = {
					api_key: 'testAPIKey',
					export_history: [
						{ download_request_body: {}, id: 1, search_response_metadata: {}, user_id: 'testsuite' },
					],
					favorite_documents: [
						{
							clone_index: 'Test',
							doc_num: 'Test',
							doc_type: 'Test',
							download_url_s: 'Test',
							favorite_id: 1,
							favorite_name: 'Test',
							favorite_summary: 'Test',
							favorited: 1,
							filename: 'Test',
							id: 'Test',
							is_clone: false,
							search_text: 'Test',
							summary: 'Test',
							title: 'Test Test Test',
							user_id: 'testsuite',
						},
					],
					favorite_groups: [
						{
							clone_index: 'Test',
							favorites: [1],
							group_description: 'Test',
							group_name: 'Test',
							group_type: 'document',
							id: 1,
							is_clone: true,
							user_id: 'testsuite',
						},
					],
					favorite_searches: [],
					favorite_topics: [
						{
							clone_index: 'Test',
							favorited: 1,
							id: 1,
							is_clone: false,
							topic_name: 'Test',
							topic_summary: 'Test',
							user_id: 'testsuite',
						},
					],
					favorite_organizations: [
						{
							clone_index: 'Test',
							favorited: 1,
							id: 1,
							is_clone: false,
							organization_name: 'Test',
							organization_summary: 'Test',
							user_id: 'testsuite',
						},
					],
					notifications: { gamechanger: { favorites: 0, history: 0, total: 0 } },
					search_history: [
						{
							cached_result: false,
							clone_name: 'Test',
							completion_time: 'Test',
							favorite: false,
							had_error: false,
							id: 1,
							is_tutorial_search: false,
							num_results: 20,
							request_body: {},
							run_at: 'Test',
							search: 'Test',
							search_type: 'Test',
							search_version: 1,
							tiny_url: 'gamechanger?tiny=24',
							url: 'Test',
							user_id: 'testsuite',
						},
					],
					pdf_opened: [
						{ document: 'test1.pdf', documenttime: '2022-03-17T13:54:58.000Z', clone_name: 'gamechanger' },
						{ document: 'test2.pdf', documenttime: '2022-03-17T13:54:57.000Z', clone_name: 'gamechanger' },
					],
					user_id: 'testsuite',
				};
				assert.deepStrictEqual(resMsg, expected);
				done();
			} catch (e) {
				assert.fail(e);
				done(e);
			}
		});
	});

	describe('#getUserSettings', () => {
		let users = [
			{
				is_beta: false,
				notifications: { gamechanger: { favorites: 0, history: 0, total: 0 } },
				search_settings: {},
				submitted_info: true,
				user_id: 'testsuite',
			},
		];
		const opts = {
			...constructorOptionsMock,
			dataApi: {},
			gcUser: {
				findOrCreate(data) {
					let user;

					users.forEach((tmpUser) => {
						if (tmpUser.user_id === data.where.user_id) {
							user = tmpUser;
						}
					});

					if (user) {
						return Promise.resolve([user, false]);
					} else {
						user = {
							user_id: data.defaults.user_id,
							is_beta: false,
							search_settings: {},
							notifications: { gamechanger: { total: 0, favorites: 0, history: 0 } },
						};
						users.push(user);

						return Promise.resolve([user, true]);
					}
				},
				findOne(data) {
					let user;

					users.forEach((tmpUser) => {
						if (tmpUser.user_id === data.where.user_id) {
							user = tmpUser;
						}
					});

					if (user) {
						return Promise.resolve(user);
					} else {
						return Promise.resolve(undefined);
					}
				},
			},
		};

		it('creates or returns a user settings', async (done) => {
			const target = new UserController(opts);

			const req = {
				...reqMock,
				body: {
					username: 'hashMe',
				},
			};

			let resCode;
			let resMsg;

			const res = {
				status(code) {
					resCode = code;
					return this;
				},
				send(msg) {
					resMsg = msg;
					return this;
				},
			};

			try {
				await target.getUserSettings(req, res);
				const expected = {
					is_beta: false,
					notifications: { gamechanger: { favorites: 0, history: 0, total: 0 } },
					search_settings: {},
					submitted_info: true,
					user_id: 'testsuite',
				};
				assert.deepStrictEqual(resMsg, expected);
				done();
			} catch (e) {
				assert.fail(e);
				done(e);
			}
		});
	});

	describe('#clearDashboardNotification', () => {
		let users = [
			{
				user_id: 'testsuite',
				notifications: { gamechanger: { total: 0, favorites: 5, history: 0 } },
				search_settings: {},
			},
			{ user_id: 'testsuite2', notifications: {}, search_settings: {} },
		];
		const sequelize = {
			transaction: jest.fn(async function (fn) {
				const transactionObj = { LOCK: { UPDATE: 'UPDATE' } };
				await fn(transactionObj);
			}),
		};
		const opts = {
			...constructorOptionsMock,
			dataApi: {},
			sequelize,
			gcUser: {
				findOne(data) {
					const user = users.find((user) => user.user_id === data.where.user_id);
					return Promise.resolve(user);
				},
				update(data, where) {
					let user = users.find((user) => user.user_id === where.user_id);
					if (user) {
						user.notifications = data.notifications;
						return Promise.resolve();
					} else {
						return Promise.reject('Fail');
					}
				},
			},
		};

		const res = {
			status(_code) {
				return this;
			},
			send(_msg) {
				return this;
			},
		};

		it('clear dashboard notifications', async (done) => {
			const target = new UserController(opts);

			const req = {
				...reqMock,
				body: {
					type: 'favorites',
					cloneName: 'gamechanger',
				},
			};

			await target.clearDashboardNotification(req, res);
			const expected = {
				notifications: { gamechanger: { favorites: 0, history: 0, total: 0 } },
				search_settings: {},
				user_id: 'testsuite',
			};
			assert.deepStrictEqual(users[0], expected);
			done();
		});

		it('clear dashboard notifications is a no-op on empty notifications', async (done) => {
			const logger = {
				...constructorOptionsMock.logger,
				error: jest.fn(),
			};
			const target = new UserController({ ...opts, logger });

			const req = {
				...reqMock,
				headers: {
					SSL_CLIENT_S_DN_CN: 'testsuite2',
				},
				body: {
					type: 'favorites',
					cloneName: 'gamechanger',
				},
			};

			await target.clearDashboardNotification(req, res);
			const expected = { notifications: {}, search_settings: {}, user_id: 'testsuite2' };
			assert.deepStrictEqual(users[1], expected);
			expect(logger.error).not.toHaveBeenCalled();
			done();
		});
	});

	describe('#updateUserAPIRequestLimit', () => {
		let users = [];
		const opts = {
			...constructorOptionsMock,
			sequelize: {
				literal(exp) {
					return;
				},
			},
			gcUser: {
				update(data, where) {
					let user;

					users.forEach((tmpUser) => {
						if (tmpUser.user_id === where.where.user_id) {
							user = tmpUser;
						}
					});

					if (user) {
						user.api_requests = user.api_requests - 1;
						return Promise.resolve();
					} else {
						return Promise.resolve('Fail');
					}
				},
			},
		};

		it('should decrement the users API request limit by one', async (done) => {
			users.push({
				user_id: 'testsuite',
				notifications: { gamechanger: { total: 0, favorites: 0, history: 0 } },
			});
			const target = new UserController(opts);

			let resCode;
			let resMsg;

			const req = {
				...reqMock,
				body: {
					username: 'hashMe',
				},
			};

			const res = {
				status(code) {
					resCode = code;
					return this;
				},
				send(msg) {
					resMsg = msg;
					return this;
				},
			};

			try {
				await target.updateUserAPIRequestLimit(req, res);
				assert.equal(resCode, 200);
				done();
			} catch (e) {
				assert.fail(e);
				done(e);
			}
		});
	});

	describe('#submitUserInfo', () => {
		let users = [{ user_id: 'testsuite', user_info: null, submitted_info: null }];
		const opts = {
			...constructorOptionsMock,
			dataApi: {},
			gcUser: {
				update(data, where) {
					let user;

					users.forEach((tmpUser) => {
						if (tmpUser.user_id === where.where.user_id) {
							user = tmpUser;
						}
					});

					if (user) {
						user.user_info = data.user_info;
						user.submitted_info = data.submitted_info;
						return Promise.resolve(data);
					} else {
						return Promise.resolve('Fail');
					}
				},
			},
		};

		it('saves a users response to user info form', async (done) => {
			const target = new UserController(opts);

			const req = {
				...reqMock,
				body: {
					email: 'test@example.com',
					org: 'org',
					q1: 'a1',
					q2: 'a2',
				},
			};

			let resCode;
			let resMsg;

			const res = {
				status(code) {
					resCode = code;
					return this;
				},
				send(msg) {
					resMsg = msg;
					return this;
				},
			};

			try {
				await target.submitUserInfo(req, res);
			} catch (e) {
				assert.fail(e);
			}
			const expected = {
				user_info: { email: 'test@example.com', org: 'org', q1: 'a1', q2: 'a2' },
				submitted_info: true,
				user_id: 'testsuite',
			};
			assert.deepStrictEqual(users[0], expected);
			assert.equal(resCode, 200);
			done();
		});
	});

	describe('#resetAPIRequestLimit', () => {
		it('should reset all API request limits to 3', async (done) => {
			const id = {
				getDataValue() {
					return 1;
				},
			};

			const gcUser = {
				findAll() {
					return [id];
				},
				update(data, where) {
					if (data.api_requests === 3 && where.where.id.length > 0) {
						return Promise.resolve([1, 1]);
					} else {
						return Promise.resolve('Fail');
					}
				},
			};

			const opts = {
				...constructorOptionsMock,
				gcUser,
			};

			const target = new UserController(opts);
			const actual = await target.resetAPIRequestLimit();
			const expected = 1;

			assert.equal(actual, expected);
			done();
		});
	});

	describe('#getRecentSearches', () => {
		it('should get recent searches', async (done) => {
			const ids = [{ id: 1 }];

			const searches = [
				{
					request_body: { test: 'test' },
					run_at: 1,
				},
			];

			const gcHistory = {
				findAll(data) {
					if (data.group) {
						return Promise.resolve(ids);
					} else {
						return Promise.resolve(searches);
					}
				},
			};

			const opts = {
				...constructorOptionsMock,
				gcHistory,
			};

			const target = new UserController(opts);

			const req = {
				...reqMock,
				body: {
					cloneName: 'gamechanger',
				},
			};

			let resCode;
			let resMsg;

			const res = {
				status(code) {
					resCode = code;
					return this;
				},
				send(msg) {
					resMsg = msg;
					return this;
				},
			};

			try {
				await target.getRecentSearches(req, res);
				const expected = [
					{
						run_at: 1,
						test: 'test',
					},
				];

				assert.equal(resCode, 200);
				assert.deepStrictEqual(resMsg, expected);
				done();
			} catch (e) {
				assert.fail();
				done(e);
			}
		});
	});
});
