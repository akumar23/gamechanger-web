const FAVORITE_DOCUMENT = require('../models').favorite_documents;
const FAVORITE_SEARCH = require('../models').favorite_searches;
const FAVORITE_TOPIC = require('../models').favorite_topics;
const FAVORITE_GROUP = require('../models').favorite_groups;
const FAVORITE_DOCUMENTS_GROUP = require('../models').favorite_documents_groups;
const FAVORITE_ORGANIZATION = require('../models').favorite_organizations;
const GC_HISTORY = require('../models').gc_history;
const GC_USER = require('../models').gc_user;
const { SearchController } = require('../../node_app/controllers/searchController');
const { getTenDigitUserId } = require('../utils/userUtility')
const LOGGER = require('../lib/logger');
const sparkMD5Lib = require('spark-md5');
const SearchUtility = require('../utils/searchUtility')
const constantsFile = require('../config/constants');
const Sequelize = require('sequelize');
const { HandlerFactory } = require('../factories/handlerFactory');

class FavoritesController {

	constructor(opts = {}) {
		const {
			logger = LOGGER,
			favoriteDocument = FAVORITE_DOCUMENT,
			favoriteSearch = FAVORITE_SEARCH,
			favoriteTopic = FAVORITE_TOPIC,
			favoriteGroup = FAVORITE_GROUP,
			favoriteDocumentsGroup = FAVORITE_DOCUMENTS_GROUP,
			favoriteOrganization = FAVORITE_ORGANIZATION,
			sparkMD5 = sparkMD5Lib,
			gcUser = GC_USER,
			gcHistory = GC_HISTORY,
			search = new SearchController(opts),
			searchUtility = new SearchUtility(opts),
			constants = constantsFile,
			handler_factory = new HandlerFactory(opts),
		} = opts;

		this.logger = logger;
		this.favoriteDocument = favoriteDocument;
		this.favoriteSearch = favoriteSearch;
		this.favoriteTopic = favoriteTopic;
		this.favoriteGroup = favoriteGroup;
		this.favoriteDocumentsGroup =favoriteDocumentsGroup;
		this.favoriteOrganization = favoriteOrganization;
		this.sparkMD5 = sparkMD5;
		this.gcUser = gcUser;
		this.gcHistory = gcHistory;
		this.search = search;
		this.searchUtility = searchUtility;
		this.constants = constants;
		this.handler_factory = handler_factory;

		this.favoriteDocumentPOST = this.favoriteDocumentPOST.bind(this);
		this.favoriteSearchPOST = this.favoriteSearchPOST.bind(this);
		this.favoriteTopicPOST = this.favoriteTopicPOST.bind(this);
		this.favoriteGroupPOST = this.favoriteGroupPOST.bind(this);
		this.addToFavoriteGroupPOST = this.addToFavoriteGroupPOST.bind(this);
		this.deleteFavoriteFromGroupPOST =this.deleteFavoriteFromGroupPOST.bind(this);
		this.favoriteOrganizationPOST = this.favoriteOrganizationPOST.bind(this);
		this.checkFavoritedSearches = this.checkFavoritedSearches.bind(this);
		this.checkFavoritedSearchesHelper = this.checkFavoritedSearchesHelper.bind(this);
		this.checkLeastRecentFavoritedSearch = this.checkLeastRecentFavoritedSearch.bind(this);
		this.clearFavoriteSearchUpdate = this.clearFavoriteSearchUpdate.bind(this);
	}

	async favoriteDocumentPOST(req, res) {
		let userId = 'Unknown';
		try {
			userId = req.get('SSL_CLIENT_S_DN_CN');

			const hashed_user = this.sparkMD5.hash(userId);
			const new_id = getTenDigitUserId(userId)
			const new_hashed_user = new_id ? this.sparkMD5.hash(new_id) : null;
			const { filename, favorite_name, favorite_summary, favorite_id, search_text, is_clone, is_favorite, clone_index = '' } = req.body;

			if (is_favorite) {
				const [favorite] = await this.favoriteDocument.findOrCreate(
					{
						where: { user_id: hashed_user, filename: filename },
						defaults: {
							user_id: hashed_user,
							new_user_id: new_hashed_user,
							filename: filename,
							favorite_name: favorite_name,
							favorite_summary: favorite_summary,
							search_text: search_text,
							is_clone: is_clone,
							clone_index: clone_index
						}
					}
				);
				res.status(200).send(favorite);
			} else {
				const deleted = this.favoriteDocument.destroy({
					where: {
						user_id: hashed_user,
						filename: filename
					}
				});
				this.favoriteDocumentsGroup.destroy({
					where: {
						favorite_document_id: favorite_id
					}
				})
				res.status(200).send(deleted);
			}
		} catch (err) {
			this.logger.error(err, '5ED9CQA', userId);
			res.status(500).send(err);
			return err;
		}
	}

	async favoriteSearchPOST(req, res) {
		let userId = 'Unknown';
		try {
			userId = req.get('SSL_CLIENT_S_DN_CN');

			const hashed_user = this.sparkMD5.hash(userId);
			const new_id = getTenDigitUserId(userId)
			const new_hashed_user = new_id ? this.sparkMD5.hash(new_id) : null;
			const { search_name, search_summary, search_text, tiny_url, document_count, is_favorite } = req.body;

			if (is_favorite) {
				const [favorite] = await this.favoriteSearch.findOrCreate(
					{
						where: { user_id: hashed_user, tiny_url: tiny_url },
						defaults: {
							user_id: hashed_user,
							new_user_id: new_hashed_user,
							search_name: search_name,
							search_summary: search_summary,
							search_text: search_text,
							tiny_url: tiny_url,
							document_count: document_count,
							updated_results: false
						}
					}
				);
				res.status(200).send(favorite);
			} else {
				const deleted = this.favoriteSearch.destroy({
					where: {
						user_id: hashed_user,
						tiny_url: tiny_url
					}
				});
				res.status(200).send(deleted);
			}
		} catch (err) {
			this.logger.error(err, '84FK46G', userId);
			res.status(500).send(err);
			return err;
		}
	}

	async favoriteTopicPOST(req, res) {
		let userId = 'Unknown';
		try {
			userId = req.get('SSL_CLIENT_S_DN_CN');

			const hashed_user = this.sparkMD5.hash(userId);
			const new_id = getTenDigitUserId(userId)
			const new_hashed_user = new_id ? this.sparkMD5.hash(new_id) : null;
			const { topic, topicSummary, is_favorite } = req.body;

			if (is_favorite) {
				const [favorite] = await this.favoriteTopic.findOrCreate(
					{
						where: { user_id: hashed_user, topic_name: topic },
						defaults: {
							user_id: hashed_user,
							new_user_id: new_hashed_user,
							topic_name: topic,
							topic_summary: topicSummary,
							is_clone: false
						}
					}
				);
				res.status(200).send(favorite);
			} else {
				const deleted = this.favoriteTopic.destroy({
					where: {
						user_id: hashed_user,
						topic_name: topic
					}
				});
				res.status(200).send(deleted);
			}
		} catch (err) {
			this.logger.error(err, 'QNFUWTT', userId);
			res.status(500).send(err);
			return err;
		}
	}

	async favoriteOrganizationPOST(req, res) {
		let userId = 'Unknown';
		try {
			userId = req.get('SSL_CLIENT_S_DN_CN');

			const hashed_user = this.sparkMD5.hash(userId);
			const new_id = getTenDigitUserId(userId)
			const new_hashed_user = new_id ? this.sparkMD5.hash(new_id) : null;
			const { organization, organizationSummary, is_favorite } = req.body;

			if (is_favorite) {
				const [favorite] = await this.favoriteOrganization.findOrCreate(
					{
						where: { user_id: hashed_user, organization_name: organization },
						defaults: {
							user_id: hashed_user,
							new_user_id: new_hashed_user,
							organization_name: organization,
							organization_summary: organizationSummary,
							is_clone: false
						}
					}
				);
				res.status(200).send(favorite);
			} else {
				const deleted = this.favoriteOrganization.destroy({
					where: {
						user_id: hashed_user,
						organization_name: organization
					}
				});
				res.status(200).send(deleted);
			}
		} catch (err) {
			this.logger.error(err, 'QNFUWTT', userId);
			res.status(500).send(err);
			return err;
		}
	}

	async favoriteGroupPOST(req, res) {
		let userId = 'Unknown';
		try {
			userId = req.get('SSL_CLIENT_S_DN_CN');

			const hashed_user = getTenDigitUserId(userId) ? this.sparkMD5.hash(getTenDigitUserId(userId)) : this.sparkMD5.hash(userId);
			const { group_type, group_name, group_description, is_clone, create, clone_index, group_ids} = req.body;

			if (create) {
				const [group] = await this.favoriteGroup.findOrCreate(
					{
						where: { user_id: hashed_user, group_name: group_name },
						defaults: {
							user_id: hashed_user,
							group_type: group_type,
							group_name: group_name,
							group_description: group_description,
							is_clone: is_clone,
							clone_index: clone_index
						}
					}
				);
				res.status(200).send(group);
			} else {
				const deletedGroup = await this.favoriteGroup.destroy({
					where: {
						id: group_ids,
					}
				});
				const deletedFavs = await this.favoriteDocumentsGroup.destroy({
					where: {
						favorite_group_id: group_ids
					}
				})
				res.status(200).send({deletedGroup, deletedFavs});
			}
		} catch (err) {
			this.logger.error(err, '2EA9CTR', userId);
			res.status(500).send(err);
			return err;
		}
	}

	async addToFavoriteGroupPOST(req, res) {
		let userId = 'Unknown';
		try {
			userId = req.get('SSL_CLIENT_S_DN_CN');
			const hashed_user = getTenDigitUserId(userId) ? this.sparkMD5.hash(getTenDigitUserId(userId)) : this.sparkMD5.hash(userId);

			const { groupId, documentIds } = req.body;
			const docObjects = documentIds.map(docId => {
				return {user_id: hashed_user, favorite_group_id: groupId, favorite_document_id: docId}
			})
			
			const existingFavorites = await this.favoriteDocumentsGroup.findAll({
				where:{
					favorite_group_id: groupId
				}
			})
			let totalInGroup = documentIds.length + existingFavorites.length;
			existingFavorites.forEach(fav => {
				if(documentIds.includes(fav.dataValues.favorite_document_id)){
					totalInGroup--;
				}
			})
			if(totalInGroup > 5){
				return res.status(400);
			}

			const [favorites] = await this.favoriteDocumentsGroup.bulkCreate(docObjects,{
				returning: true,
				ignoreDuplicates: true
			})
			res.status(200).send(favorites);
		} catch (err) {
			this.logger.error(err, '1YT9HQB', userId);
			res.status(500).send(err);
			return err;
		}
	}

	async deleteFavoriteFromGroupPOST(req, res) {
		let userId = 'Unknown';
		try {
			userId = req.get('SSL_CLIENT_S_DN_CN');
			const { groupId, documentId } = req.body;

			const removed = await this.favoriteDocumentsGroup.destroy({
				where: {
					favorite_group_id: groupId,
					favorite_document_id: documentId
				}
			})
			res.status(200).send({removed});
		} catch (err) {
			this.logger.error(err, '2XR1QAD', userId);
			console.log(err);
			res.status(500).send(err);
			return err;
		}
	}

	async checkFavoritedSearches(req, res) {
		const userId = req.get('SSL_CLIENT_S_DN_CN');

		try {
			await this.checkFavoritedSearchesHelper(userId);
			res.status(200).send('checked favorited searches for new results');
		} catch (err) {
			const { message } = err;
			this.logger.error(message, '4X6AOZ2', userId);
		}
	}

	async checkFavoritedSearchesHelper(userId) {
		try {
			// get all users
			const users = await this.gcUser.findAll();

			for (const user of users) {

				let numNotifications = 0;

				// get all favorite searches for this user
				try {
					const favoriteSearches = await this.favoriteSearch.findAll({
						where: {user_id: user.user_id},
						raw: true
					});

					// for each favorite search, get its search request_body from gc history
					for (const search of favoriteSearches) {

						// if this hasn't been checked by the cache reload already
						if (!search.run_by_cache) {
							try {
								// every favorited search has a tiny_url generated for it
								const history = await this.gcHistory.findOne({
									where: {
										user_id: user.user_id,
										tiny_url: search.tiny_url
									}
								});

								if (history.request_body) {
									const searchResults = await this.searchUtility.documentSearch(null, {body:history.request_body}, {esClientName: 'gamechanger', esIndex: this.constants.GAMECHANGER_ELASTIC_SEARCH_OPTS.index}, userId);
									if (searchResults.totalCount > search.document_count) {

										numNotifications += 1;

										await this.favoriteSearch.update({
											updated_results: true,
											run_by_cache: false,
											document_count: searchResults.totalCount
										},
										{
											where: {
												id: search.id
											}
										});
									}
								} else {
									this.logger.info('no request body data to make the search');
								}


							} catch (err) {
								this.logger.error(err.message, 'DQ26224', userId);
								this.logger.error(err);
							}
						} else {
							await this.favoriteSearch.update({ run_by_cache: false },
								{
									where: {
										id: search.id
									}
								});
						}

					}

				} catch (err) {
					const { message } = err;
					this.addInternalUser.apply(message, '788WN93', userId);
				}

				let notifications = user.notifications ? Object.assign({}, user.notifications) : { favorites: 0, history: 0, total: 0 };
				notifications.favorites = numNotifications;
				notifications.total = numNotifications + notifications.history;

				this.gcUser.update({ notifications }, {
					where: {
						user_id: user.user_id
					}
				});
			}
		} catch (err) {
			const { message } = err;
			this.logger.error(message, 'M4ZSJKR', userId);
		}
	}
	
	async checkLeastRecentFavoritedSearch() {
		try {
			const favorite = await this.favoriteSearch.findOne({
				order: [['last_checked', 'ASC'], ['id', 'ASC']],
			});
			if (!favorite) {
				this.logger.info('no favorite searches to check');
				return;
			}

			// update timestamp first so we don't get stuck on a specific search in the case
			// that it fails -- also reduces (but doesn't eliminate) race conditions of multiple
			// app instances checking the same search (although the race condition is benign
			// as far as correctness; we could lock the row to eliminate but not sure we want to)
			favorite.last_checked = Sequelize.fn('NOW');
			await favorite.save();

			// every favorited search has a tiny_url generated for it so look for the
			// search body the last time it was run in the search history;
			// this is a kludge because the backend has no functionality to directly
			// convert a tiny url to a search
			const history = await this.gcHistory.findOne({
				where: {
					user_id: favorite.user_id,
					tiny_url: favorite.tiny_url
				},
				order: [['run_at', 'DESC']]
			});

			if (!history || !history.request_body) {
				this.logger.console.error('no request body data to make the search', 'B32AUDE');
				return;
			}
			
			// largely copypasta-ed from modularGameChangerController.js
			// so will need to be updated if ^ changes (we can't directly use the original code as-is);
			// unfortunately the recorded `request_body` in the history isn't the actual original search body,
			// so we attempt to transform it back into the original format (not sure how brittle this is)
			const { cloneName, searchText, offset = 0, limit = 1 /*, options */} = history.request_body;
			const options = history.request_body;
			const userId = favorite.user_id;
			const permissions = ['Webapp Super Admin', 'Tier 3 Support']; // XXX: ??? is this ok -- do we need to pull the actual user permissions?
			const handler = this.handler_factory.createHandler('search', cloneName);
			const results = await handler.search(searchText, offset, limit, options, cloneName, permissions, userId);
			const error = handler.getError();
			if (error.code) {
				this.logger.console.error('favorites search error', 'YN3USY3');
				return;
			}
			if (results.totalCount != favorite.document_count) {
				favorite.updated_results = true;
				favorite.document_count = results.totalCount;
				await favorite.save();
			}
		} catch (err) {
			const { message } = err;
			this.logger.error(message || err, 'D8HNW90');
		}
	}

	async clearFavoriteSearchUpdate(req, res) {
		const userId = req.get('SSL_CLIENT_S_DN_CN');

		try {
			const hashed_user = this.sparkMD5.hash(userId);

			const { tinyurl } = req.body;

			await this.favoriteSearch.update({ updated_results: false },
				{
					where: {
						user_id: hashed_user,
						tiny_url: tinyurl
					}
				});

			res.status(200).send();

		} catch (err) {
			const { message } = err;
			this.logger.error(message, 'XF00LQC', userId);
		}
	}

}

module.exports.FavoritesController = FavoritesController;
