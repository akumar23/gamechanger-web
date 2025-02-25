const LOGGER = require('@dod-advana/advana-logger');
const constantsFile = require('../../config/constants');
const SearchUtility = require('../../utils/searchUtility');

class EDASearchUtility {
	constructor(opts = {}) {
		const { logger = LOGGER, constants = constantsFile, searchUtility = new SearchUtility(opts) } = opts;

		this.logger = logger;
		this.constants = constants;
		this.searchUtility = searchUtility;

		this.getElasticsearchPagesQuery = this.getElasticsearchPagesQuery.bind(this);
		this.getElasticsearchStatsQuery = this.getElasticsearchStatsQuery.bind(this);
		this.cleanUpEsResults = this.cleanUpEsResults.bind(this);
	}

	getElasticsearchPagesQuery(
		{
			searchText = '',
			parsedQuery = '',
			offset = 0,
			limit = 20,
			charsPadding = 90,
			operator = 'and',
			storedFields = [
				'filename',
				'title',
				'page_count',
				'doc_type',
				'doc_num',
				'ref_list',
				'id',
				'summary_30',
				'keyw_5',
				'p_text',
				'type',
				'p_page',
				'display_title_s',
				'display_org_s',
				'display_doc_type_s',
			],
			extStoredFields = [],
			extSearchFields = [],
			edaSearchSettings = {},
		},
		user
	) {
		try {
			// add additional search fields to the query
			let filterQueries = [];

			filterQueries = filterQueries.concat(this.getEDASearchQuery(edaSearchSettings, user));

			storedFields = [...storedFields, ...extStoredFields];

			let query = {
				_source: {
					includes: [
						'pagerank_r',
						'kw_doc_score_r',
						'orgs_rs',
						'*_eda_n*',
						'fpds*',
						'sow_pws_text_eda_ext_t',
						'clins_text_n',
						'clins_parsed_n',
					],
				},
				stored_fields: storedFields,
				from: offset,
				size: limit,
				track_total_hits: true,
				aggs: {
					contractTotals: {
						nested: {
							path: 'fpds_ng_n',
						},
						aggs: {
							agencies: {
								terms: {
									field: 'fpds_ng_n.contracting_agency_name_eda_ext.keyword',
									size: 1000000,
								},
								aggs: {
									docs: {
										reverse_nested: {},
										aggs: {
											obligatedAmounts: {
												nested: {
													path: 'fpds_ng_n',
												},
												aggs: {
													sum_agg: {
														sum: {
															field: 'fpds_ng_n.dollars_obligated_eda_ext_f',
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
					contractTotalsNoAgency: {
						filter: {
							bool: {
								must_not: [
									{
										nested: {
											path: 'fpds_ng_n',
											query: {
												exists: {
													field: 'fpds_ng_n.contracting_agency_name_eda_ext.keyword',
												},
											},
										},
									},
								],
							},
						},
						aggs: {
							obligatedAmounts: {
								nested: {
									path: 'fpds_ng_n',
								},
								aggs: {
									sum_agg: {
										sum: {
											field: 'fpds_ng_n.dollars_obligated_eda_ext_f',
										},
									},
								},
							},
						},
					},
				},
				query: {
					bool: {
						must: [
							{
								bool: {
									should: [
										{
											nested: {
												path: 'pages',
												inner_hits: {
													_source: false,
													stored_fields: ['pages.filename', 'pages.p_raw_text'],
													from: 0,
													size: 5,
													highlight: {
														fields: {
															'pages.filename.search': {
																number_of_fragments: 0,
															},
															'pages.p_raw_text': {
																fragment_size: 2 * charsPadding,
																number_of_fragments: 1,
															},
														},
														fragmenter: 'span',
													},
												},
												query: {
													bool: {
														should: [
															{
																wildcard: {
																	'pages.filename.search': {
																		value: `${parsedQuery}*`,
																		boost: 15,
																	},
																},
															},
															{
																query_string: {
																	query: `${parsedQuery}`,
																	default_field: 'pages.p_raw_text',
																	default_operator: `${operator}`,
																	fuzzy_max_expansions: 100,
																	fuzziness: 'AUTO',
																},
															},
														],
													},
												},
											},
										},
									],
								},
							},
						],
						should: [
							{
								multi_match: {
									query: `${parsedQuery}`,
									fields: ['keyw_5^2', 'id^2', 'summary_30', 'pages.p_raw_text'],
									operator: 'or',
								},
							},
							{
								rank_feature: {
									field: 'pagerank_r',
									boost: 0.5,
								},
							},
							{
								rank_feature: {
									field: 'kw_doc_score_r',
									boost: 0.1,
								},
							},
						],
					},
				},
			};

			// exclude certain terms or phrases
			if (edaSearchSettings.excludeTerms && edaSearchSettings.excludeTerms !== '') {
				let phrases = edaSearchSettings.excludeTerms.split(';');
				let should = [];

				phrases.forEach((phrase) => {
					should.push({
						wildcard: {
							'pages.filename.search': {
								value: `*${phrase}*`,
							},
						},
					});
					should.push({
						match_phrase: {
							'pages.p_raw_text': phrase,
						},
					});
				});

				query.query.bool.must_not = [
					{
						bool: {
							should: [
								{
									nested: {
										path: 'pages',
										query: {
											bool: {
												should,
											},
										},
									},
								},
							],
						},
					},
				];
			}

			if (extSearchFields.length > 0) {
				const extQuery = {
					multi_match: {
						query: searchText,
						fields: [],
						operator: 'or',
					},
				};
				extQuery.multi_match.fields = extSearchFields.map((field) => field.toLowerCase());
				query.query.bool.must[0].bool.should = query.query.bool.must[0].bool.should.concat(extQuery);
			}

			if (filterQueries.length > 0) {
				query.query.bool.filter = filterQueries;
			}

			return query;
		} catch (err) {
			this.logger.error(err, 'M6THI27', user);
		}
	}

	getElasticsearchStatsQuery(
		{ searchText, parsedQuery, limit = 20, operator = 'and', extSearchFields = [], edaSearchSettings = {} },
		user
	) {
		try {
			// add additional search fields to the query
			let filterQueries = [];

			filterQueries = filterQueries.concat(this.getEDASearchQuery(edaSearchSettings, user));

			let query = {
				_source: {
					includes: ['extracted_data_eda_n', 'metadata_type_eda_ext', 'fpds_ng_n'],
				},
				from: 0,
				size: limit,
				track_total_hits: true,
				query: {
					bool: {
						must: [
							{
								bool: {
									should: [
										{
											nested: {
												path: 'pages',
												query: {
													bool: {
														should: [
															{
																wildcard: {
																	'pages.filename.search': {
																		value: `${parsedQuery}*`,
																		boost: 15,
																	},
																},
															},
															{
																query_string: {
																	query: `${parsedQuery}`,
																	default_field: 'pages.p_raw_text',
																	default_operator: `${operator}`,
																	fuzzy_max_expansions: 100,
																	fuzziness: 'AUTO',
																},
															},
														],
													},
												},
											},
										},
									],
								},
							},
						],
						should: [
							{
								multi_match: {
									query: `${parsedQuery}`,
									fields: ['keyw_5^2', 'id^2', 'summary_30', 'pages.p_raw_text'],
									operator: 'or',
								},
							},
							{
								rank_feature: {
									field: 'pagerank_r',
									boost: 0.5,
								},
							},
							{
								rank_feature: {
									field: 'kw_doc_score_r',
									boost: 0.1,
								},
							},
						],
					},
				},
			};

			// exclude certain terms or phrases
			if (edaSearchSettings.excludeTerms && edaSearchSettings.excludeTerms !== '') {
				let phrases = edaSearchSettings.excludeTerms.split(';');
				let should = [];

				phrases.forEach((phrase) => {
					should.push({
						wildcard: {
							'pages.filename.search': {
								value: `*${phrase}*`,
							},
						},
					});
					should.push({
						match_phrase: {
							'pages.p_raw_text': phrase,
						},
					});
				});

				query.query.bool.must_not = [
					{
						bool: {
							should: [
								{
									nested: {
										path: 'pages',
										query: {
											bool: {
												should,
											},
										},
									},
								},
							],
						},
					},
				];
			}

			if (extSearchFields.length > 0) {
				const extQuery = {
					multi_match: {
						query: searchText,
						fields: [],
						operator: 'or',
					},
				};
				extQuery.multi_match.fields = extSearchFields.map((field) => field.toLowerCase());
				query.query.bool.must[0].bool.should = query.query.bool.must[0].bool.should.concat(extQuery);
			}

			if (filterQueries.length > 0) {
				query.query.bool.must = query.query.bool.must.concat(filterQueries);
			}
			return query;
		} catch (err) {
			this.logger.error(err, 'M7THI27', user);
		}
	}

	getEDASearchQuery(settings, user) {
		const filterQueries = [];

		try {
			// summary view filter
			if (settings.issueAgency) {
				filterQueries.push({
					nested: {
						path: 'extracted_data_eda_n',
						query: {
							bool: {
								must: [
									{
										match: {
											'extracted_data_eda_n.contract_issue_office_name_eda_ext':
												settings.issueAgency,
										},
									},
								],
							},
						},
					},
				});
			}

			// ISSUE ORGANIZATION
			if (!settings.allOrgsSelected && settings.organizations && settings.organizations.length > 0) {
				const orgQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							bool: {
								should: [],
							},
						},
					},
				};

				const majcomQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							bool: {
								should: [],
							},
						},
					},
				};

				const orgAndMajcomQuery = {
					bool: { should: [] },
				};

				const orgMap = {
					army: 'W*',
					navy: 'N* OR M*',
					'air force': 'F*',
					defense: 'H*',
				};

				let orgString = '';
				let setMajcomQuery = false;
				let setOrgQuery = false;

				const orgs = settings.organizations;
				// figure out if we will have both org and majcom queries
				// if so then we will need to wrap them in the orgAndMajcomQuery
				for (const org of orgs) {
					if (settings.majcoms && settings.majcoms[org] && settings.majcoms[org].length > 0) {
						setMajcomQuery = true;
					}
					if (!settings.majcoms[org] || settings.majcoms[org].length === 0) {
						setOrgQuery = true;
					}
				}
				const orgAndMajcoms = setOrgQuery && setMajcomQuery;

				let firstOrgQuery = true;
				for (const org of orgs) {
					// for filtering by MAJCOM / sub orgs
					if (settings.majcoms && settings.majcoms[org] && settings.majcoms[org].length > 0) {
						for (const subOrg of settings.majcoms[org]) {
							majcomQuery.nested.query.bool.should.push({
								match: {
									'fpds_ng_n.contracting_agency_name_eda_ext': {
										query: subOrg,
										operator: 'AND',
									},
								},
							});
						}
						if (orgAndMajcoms) {
							orgAndMajcomQuery.bool.should.push(majcomQuery);
						} else {
							filterQueries.push(majcomQuery);
						}
					}

					// for Issue Organization (no specific majcoms selected)
					// we construct the string that goes in the query field for ES query_string
					if (!settings.majcoms[org] || settings.majcoms[org].length === 0) {
						let orgText = '';
						if (orgMap[org]) {
							orgText = orgMap[org];
						}

						orgString += `${!firstOrgQuery ? ' OR ' : ''}${orgText}`;
						firstOrgQuery = false;
					}
				}

				if (orgString && orgString.length > 0) {
					orgQuery.nested.query.bool.should.push({
						query_string: {
							query: orgString,
							default_field: 'fpds_ng_n.contracting_office_code_eda_ext',
						},
					});
					if (orgAndMajcoms) {
						orgAndMajcomQuery.bool.should.push(orgQuery);
					} else {
						filterQueries.push(orgQuery);
					}
				}

				if (orgAndMajcoms) {
					filterQueries.push(orgAndMajcomQuery);
				}
			}

			// DATE RANGE
			if (settings.startDate || settings.endDate) {
				const rangeQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							range: {
								'fpds_ng_n.date_signed_eda_ext_dt': {},
							},
						},
					},
				};

				let push = false;

				if (settings.startDate) {
					rangeQuery.nested.query.range['fpds_ng_n.date_signed_eda_ext_dt'].gte = settings.startDate;
					push = true;
				}

				if (settings.endDate) {
					rangeQuery.nested.query.range['fpds_ng_n.date_signed_eda_ext_dt'].lte = settings.endDate;
					push = true;
				}

				if (push) {
					filterQueries.push(rangeQuery);
				}
			}

			// ISSUE OFFICE DODAAC
			if (settings.issueOfficeDoDAAC && settings.issueOfficeDoDAAC.length > 0) {
				const nestedQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							bool: {
								should: [],
							},
						},
					},
				};
				for (const issueOfficeDoDAAC of settings.issueOfficeDoDAAC) {
					nestedQuery.nested.query.bool.should.push({
						query_string: {
							default_field: 'fpds_ng_n.contracting_office_code_eda_ext',
							default_operator: 'or',
							query: issueOfficeDoDAAC,
						},
					});
				}
				filterQueries.push(nestedQuery);
			}

			// ISSUE OFFICE NAME
			if (settings.issueOfficeName && settings.issueOfficeName.length > 0) {
				const nestedQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							bool: {
								should: [],
							},
						},
					},
				};
				for (const issueOfficeName of settings.issueOfficeName) {
					nestedQuery.nested.query.bool.should.push({
						query_string: {
							default_field: 'fpds_ng_n.contracting_office_name_eda_ext',
							default_operator: 'or',
							query: issueOfficeName,
						},
					});
				}
				filterQueries.push(nestedQuery);
			}

			// FISCAL YEARS
			if (settings.allYearsSelected === false && settings.fiscalYears) {
				const nestedQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							bool: {
								should: [],
							},
						},
					},
				};

				for (const year of settings.fiscalYears) {
					const ceil = parseInt(year) + 1;
					nestedQuery.nested.query.bool.should.push({
						range: {
							'fpds_ng_n.date_signed_eda_ext_dt': {
								gte: year,
								lte: ceil.toString(),
								format: 'yyyy',
							},
						},
					});
				}
				filterQueries.push(nestedQuery);
			}

			// DATA SOURCE
			if (settings.allDataSelected === false && settings.contractData) {
				const contractTypes = Object.keys(settings.contractData);
				const filterQuery = {
					bool: {
						should: [],
					},
				};
				let metadataText = '';

				// set up query based on PDS, SYN, or PDF selected
				for (const contractType of contractTypes) {
					if (settings.contractData[contractType]) {
						if (contractType === 'none') {
							// PDF
							filterQuery.bool.should.push({
								match: {
									is_supplementary_data_included_eda_ext_b: false,
								},
							});
						} else if (contractType === 'fpds') {
							filterQueries.push(
								this.getFPDSFilterQuery('fpds_ng_n.contracting_office_code_eda_ext', '')
							);
						} else {
							// PDS or SYN
							metadataText += contractType + ', ';
						}
					}
				}

				if (metadataText != '') {
					metadataText = metadataText.substring(0, metadataText.length - 2);
					filterQuery.bool.should.push({
						bool: {
							must: [
								{
									match: {
										metadata_type_eda_ext: metadataText,
									},
								},
								{
									match: {
										is_supplementary_data_included_eda_ext_b: true,
									},
								},
							],
						},
					});
				}

				if (filterQuery.bool.should.length > 0) {
					filterQueries.push(filterQuery);
				}
			}

			// OBLIGATED AMOUNT
			if (
				(settings.minObligatedAmount && settings.minObligatedAmount.length > 0) ||
				(settings.maxObligatedAmount && settings.maxObligatedAmount.length > 0)
			) {
				const rangeQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							range: {
								'fpds_ng_n.dollars_obligated_eda_ext_f': {},
							},
						},
					},
				};

				let push = false;

				if (settings.minObligatedAmount && settings.minObligatedAmount.length > 0) {
					rangeQuery.nested.query.range['fpds_ng_n.dollars_obligated_eda_ext_f'].gte =
						settings.minObligatedAmount;
					push = true;
				}

				if (settings.maxObligatedAmount && settings.maxObligatedAmount.length > 0) {
					rangeQuery.nested.query.range['fpds_ng_n.dollars_obligated_eda_ext_f'].lte =
						settings.maxObligatedAmount;
					push = true;
				}

				if (push) {
					filterQueries.push(rangeQuery);
				}
			}

			// CONTRACTS OR MODS
			if (settings.contractsOrMods !== 'both') {
				const filterQuery = {
					match: {
						mod_identifier_eda_ext: 'base_award',
					},
				};

				const boolQuery = {
					bool: {
						must_not: [
							{
								term: {
									mod_identifier_eda_ext: 'base_award',
								},
							},
						],
					},
				};

				if (settings.contractsOrMods === 'contracts') {
					filterQueries.push(filterQuery);
				} else if (settings.contractsOrMods === 'mods') {
					filterQueries.push(boolQuery);
				}
			}

			// VENDOR NAME
			if (settings.vendorName && settings.vendorName.length > 0) {
				filterQueries.push(this.getFPDSFilterQuery('fpds_ng_n.vendor_name_eda_ext', settings.vendorName));
			}

			// FUNDING OFFICE CODE
			if (settings.fundingOfficeCode && settings.fundingOfficeCode.length > 0) {
				const nestedQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							bool: {
								should: [],
							},
						},
					},
				};
				for (const fundingOfficeCode of settings.fundingOfficeCode) {
					nestedQuery.nested.query.bool.should.push({
						query_string: {
							default_field: 'fpds_ng_n.funding_office_code_eda_ext',
							default_operator: 'or',
							query: fundingOfficeCode,
						},
					});
				}
				filterQueries.push(nestedQuery);
			}

			// IDV PIID
			if (settings.idvPIID && settings.idvPIID.length > 0) {
				filterQueries.push(this.getFPDSFilterQuery('fpds_ng_n.idv_piid_eda_ext', settings.idvPIID));
			}

			// MOD NUMBER
			if (settings.modNumber && settings.modNumber.length > 0) {
				const nestedQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							bool: {
								should: [],
							},
						},
					},
				};
				for (const modNumber of settings.modNumber) {
					nestedQuery.nested.query.bool.should.push({
						query_string: {
							default_field: 'fpds_ng_n.modification_number_eda_ext',
							default_operator: 'or',
							query: modNumber,
						},
					});
				}
				filterQueries.push(nestedQuery);
			}

			// PIID
			if (settings.piid && settings.piid.length > 0) {
				filterQueries.push(this.getFPDSFilterQuery('fpds_ng_n.piid_eda_ext', settings.piid));
			}

			// DESCRIPTION OF REQUIREMENTS
			if (settings.reqDesc && settings.reqDesc.length > 0) {
				filterQueries.push(
					this.getFPDSFilterQuery('fpds_ng_n.description_of_requirement_eda_ext', settings.reqDesc)
				);
			}

			// PSC
			if (settings.psc && settings.psc.length > 0) {
				const nestedQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							bool: {
								should: [],
							},
						},
					},
				};
				for (const psc of settings.psc) {
					if (psc.code === 'Product') {
						//nnumbers 1 - 9
						for (let i = 1; i <= 9; i += 1) {
							nestedQuery.nested.query.bool.should.push({
								query_string: {
									default_field: 'fpds_ng_n.psc_eda_ext',
									default_operator: 'or',
									query: `${i}*`,
								},
							});
						}
					} else if (psc.code === 'Research and Development') {
						nestedQuery.nested.query.bool.should.push({
							query_string: {
								default_field: 'fpds_ng_n.psc_eda_ext',
								default_operator: 'or',
								query: 'A*',
							},
						});
					} else if (psc.code === 'Service') {
						const serviceLetters = [
							'B',
							'C',
							'D',
							'E',
							'F',
							'G',
							'H',
							'J',
							'K',
							'L',
							'M',
							'N',
							'P',
							'Q',
							'R',
							'S',
							'T',
							'U',
							'V',
							'W',
							'X',
							'Y',
							'Z',
						];
						for (let letter of serviceLetters) {
							nestedQuery.nested.query.bool.should.push({
								query_string: {
									default_field: 'fpds_ng_n.psc_eda_ext',
									default_operator: 'or',
									query: `${letter}*`,
								},
							});
						}
					} else if (psc.hasChildren) {
						nestedQuery.nested.query.bool.should.push({
							query_string: {
								default_field: 'fpds_ng_n.psc_eda_ext',
								default_operator: 'or',
								query: `${psc.code}*`,
							},
						});
					} else {
						nestedQuery.nested.query.bool.should.push({
							query_string: {
								default_field: 'fpds_ng_n.psc_eda_ext',
								default_operator: 'or',
								query: psc.code,
							},
						});
					}
				}
				filterQueries.push(nestedQuery);
			}

			// FUNDING AGENCY NAME
			if (settings.fundingAgencyName && settings.fundingAgencyName.length > 0) {
				const nestedQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							bool: {
								should: [],
							},
						},
					},
				};
				for (const fundingAgencyName of settings.fundingAgencyName) {
					nestedQuery.nested.query.bool.should.push({
						query_string: {
							default_field: 'fpds_ng_n.funding_agency_name_eda_ext',
							default_operator: 'or',
							query: fundingAgencyName,
						},
					});
				}
				filterQueries.push(nestedQuery);
			}

			// NAICS
			if (settings.naicsCode && settings.naicsCode.length > 0) {
				const nestedQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							bool: {
								should: [],
							},
						},
					},
				};
				for (const naicsCode of settings.naicsCode) {
					if (naicsCode.hasChildren) {
						nestedQuery.nested.query.bool.should.push({
							query_string: {
								default_field: 'fpds_ng_n.naics_code_eda_ext',
								default_operator: 'or',
								query: `${naicsCode.code}*`,
							},
						});
					} else {
						nestedQuery.nested.query.bool.should.push({
							query_string: {
								default_field: 'fpds_ng_n.naics_code_eda_ext',
								default_operator: 'or',
								query: naicsCode.code,
							},
						});
					}
				}
				filterQueries.push(nestedQuery);
			}

			// DUNS
			if (settings.duns && settings.duns.length > 0) {
				const nestedQuery = {
					nested: {
						path: 'fpds_ng_n',
						query: {
							bool: {
								should: [],
							},
						},
					},
				};
				for (const duns of settings.duns) {
					nestedQuery.nested.query.bool.should.push({
						query_string: {
							default_field: 'fpds_ng_n.duns_eda_ext',
							default_operator: 'or',
							query: duns,
						},
					});
				}
				filterQueries.push(nestedQuery);
			}

			// CONTRACT SOW
			if (settings.contractSOW && settings.contractSOW.length > 0) {
				filterQueries.push({
					query_string: {
						query: `*${settings.contractSOW}*`,
						default_field: 'sow_pws_text_eda_ext_t',
					},
				});
			}

			// CLIN TEXT
			if (settings.clinText && settings.clinText.length > 0) {
				filterQueries.push({
					query_string: {
						query: `*${settings.clinText}*`,
						default_field: 'clins_raw_text_t',
					},
				});
			}
		} catch (err) {
			console.log(err);
			this.logger.error(err.message, 'FKJ37ZZ', user);
		}

		return filterQueries;
	}

	// provide the setting field name, the elasticsearch field name, and the field values
	// return the ES nested query to add to a filtered query
	getFPDSFilterQuery(esFieldName, fieldValue) {
		const regex = /[\+\-\=\&\|\>\<\!\(\)\{\}\[\]\^\"\~\*\?\:\\\/]+/g;
		const matches = fieldValue.match(regex);

		if (matches) {
			for (const match of matches) {
				fieldValue = fieldValue.replace(match, `\\${match}`);
			}
		}

		let query = {
			nested: {
				path: 'fpds_ng_n',
				query: {
					bool: {
						should: [
							{
								query_string: {
									query: `*${fieldValue}*`,
									default_field: esFieldName,
									fuzziness: 2,
								},
							},
						],
					},
				},
			},
		};

		if (esFieldName === 'fpds_ng_n.psc_eda_ext') {
			query.nested.query.bool.should.push({
				query_string: {
					query: `*${fieldValue}*`,
					default_field: 'fpds_ng_n.psc_desc_eda_ext',
					fuzziness: 2,
				},
			});
		}

		return query;
	}

	cleanContractTotals(contractNoAgencyBucket, contractBuckets) {
		let totalObligatedAmount = 0;
		const cleanedContractTotals = contractBuckets.map((bucket) => {
			totalObligatedAmount += bucket.docs.obligatedAmounts.sum_agg.value;
			return {
				key: bucket.key,
				count: bucket.doc_count,
				value: bucket.docs.obligatedAmounts.sum_agg.value,
			};
		});
		if (contractNoAgencyBucket)
			cleanedContractTotals.push({
				key: 'No Agency',
				count: contractNoAgencyBucket.doc_count,
				value: contractNoAgencyBucket.sum_agg.value,
			});
		return { totalObligatedAmount, cleanedContractTotals };
	}

	cleanHitsWithPage(hit, pageSet, result, user) {
		hit.inner_hits.pages.hits.hits.forEach((phit) => {
			const pageIndex = phit._nested.offset;
			let pageNumber = pageIndex + 1;
			// one hit per page max
			if (!pageSet.has(pageNumber)) {
				const [snippet, usePageZero] = this.searchUtility.getESHighlightContent(phit, user);
				if (usePageZero) {
					if (pageSet.has(0)) {
						return;
					} else {
						pageNumber = 0;
						pageSet.add(0);
					}
				}
				pageSet.add(pageNumber);
				result.pageHits.push({ snippet, pageNumber });
			}
		});
	}

	cleanHitsNoGivenPage(hit, pageSet, result, _source, _score, user) {
		Object.keys(hit.inner_hits).forEach((id) => {
			const { file_location_eda_ext } = _source;
			result.file_location_eda_ext = file_location_eda_ext;
			result.score = _score;
			hit.inner_hits[id].hits.hits.forEach((phit) => {
				const pageIndex = phit._nested.offset;
				const paragraphIdBeingMatched = parseInt(id);
				const text = phit.fields['pages.p_raw_text'][0];
				const score = phit._score;
				let pageNumber = pageIndex + 1;

				// one hit per page max
				if (!pageSet.has(pageNumber)) {
					const [snippet, usePageZero] = this.searchUtility.getESHighlightContent(phit, user);
					if (usePageZero) {
						if (pageSet.has(0)) {
							return;
						} else {
							pageNumber = 0;
							pageSet.add(0);
						}
					}
					pageSet.add(pageNumber);
					result.pageHits.push({
						snippet,
						pageNumber,
						paragraphIdBeingMatched,
						score,
						text,
						id,
					});
				}
			});
		});
	}

	cleanInnerHits(hit, pageSet, result, _source, _score, user) {
		if (hit.inner_hits) {
			if (hit.inner_hits.pages) {
				this.cleanHitsWithPage(hit, pageSet, result, user);
			} else {
				this.cleanHitsNoGivenPage(hit, pageSet, result, _source, _score, user);
			}
		}
	}

	cleanKeyw_5(result) {
		if (Array.isArray(result['keyw_5'])) {
			result['keyw_5'] = result['keyw_5'].join(', ');
		} else {
			result['keyw_5'] = '';
		}
	}

	cleanHighlights(hit, result) {
		if (hit.highlight) {
			if (hit.highlight['title.search']) {
				result.pageHits.push({ title: 'Title', snippet: hit.highlight['title.search'][0] });
			}
			if (hit.highlight.keyw_5) {
				result.pageHits.push({ title: 'Keywords', snippet: hit.highlight.keyw_5[0] });
			}
		}
	}

	cleanUpEsResults(raw, searchTerms, user, selectedDocuments, expansionDict, index, query) {
		try {
			let results = {
				query,
				totalCount:
					selectedDocuments && selectedDocuments.length > 0
						? selectedDocuments.length
						: raw.body.hits.total.value,
				docs: [],
			};

			const { body = {} } = raw;
			const { aggregations = {} } = body;
			const { contractTotals = {}, contractTotalsNoAgency = {} } = aggregations;
			const contractBuckets = contractTotals?.agencies?.buckets ? contractTotals.agencies.buckets : [];
			const contractNoAgencyBucket = contractTotalsNoAgency?.obligatedAmounts;

			let cleanContractObject = this.cleanContractTotals(contractNoAgencyBucket, contractBuckets);
			const { cleanedContractTotals, totalObligatedAmount } = cleanContractObject;

			results.issuingOrgs = cleanedContractTotals;
			results.totalObligatedAmount = totalObligatedAmount;

			raw.body.hits.hits.forEach((r) => {
				let result = this.searchUtility.transformEsFields(r.fields);
				const { _source = {}, fields = {}, _score = 0 } = r;
				const { topics_s = {} } = _source;
				result.topics_s = topics_s;
				result.score = _score;

				if (
					!selectedDocuments ||
					selectedDocuments.length === 0 ||
					selectedDocuments.indexOf(result.filename) !== -1
				) {
					result.pageHits = [];
					const pageSet = new Set();

					this.cleanInnerHits(r, pageSet, result, _source, _score, user);

					result.pageHits.sort((a, b) => a.pageNumber - b.pageNumber);

					this.cleanHighlights(r, result);

					result.pageHitCount = pageSet.size;

					try {
						const { metadata_type_eda_ext } = fields;
						result.metadata_type_eda_ext = metadata_type_eda_ext && metadata_type_eda_ext[0];
						result = this.getExtractedFields(_source, result);
					} catch (err) {
						console.log(err);
						console.log('Error parsing EDA fields');
					}

					result.esIndex = index;

					this.cleanKeyw_5(result);

					if (!result.ref_list) {
						result.ref_list = [];
					}
					results.docs.push(result);
				}
			});
			results.searchTerms = searchTerms;
			results.expansionDict = expansionDict;

			return results;
		} catch (err) {
			console.log(err);
			this.logger.error(err.message, 'FKJ37ZU', user);
		}
	}

	setMajcoms(org, result, adminPresent) {
		if (org.dodaac_eda_ext === result.contract_issue_dodaac_eda_ext) {
			// match issue office
			result.contract_issue_majcom_eda_ext = org.majcom_display_name_eda_ext; // majcom
		} else if (org.dodaac_eda_ext === result.paying_office_dodaac_eda_ext) {
			// match paying office
			result.paying_office_majcom_eda_ext = org.majcom_display_name_eda_ext; // majcom
		} else if (adminPresent && org.dodaac_eda_ext === result.contract_admin_name_eda_ext) {
			// match admin office
			result.contract_admin_majcom_eda_ext = org.majcom_display_name_eda_ext; // majcom
		}

		return result;
	}

	getExtractedFields(source, result) {
		const { extracted_data_eda_n, fpds_ng_n, clins_parsed_n, clins_parsed_successfully_b } = source;
		const data = extracted_data_eda_n;

		result.clins_parsed_successfully_b = clins_parsed_successfully_b;
		result.clins = clins_parsed_n;

		// temporarily pull in all fpds data
		if (fpds_ng_n) {
			let fpdsKeys = Object.keys(fpds_ng_n);
			for (const key of fpdsKeys) {
				result['fpds_' + key] = fpds_ng_n[key];
			}
		}

		if (!data) {
			return result;
		}
		// Contract Issuing Office Name and Contract Issuing Office DoDaaC
		result.contract_issue_name_eda_ext = data.contract_issue_office_name_eda_ext;
		result.contract_issue_dodaac_eda_ext = data.contract_issue_office_dodaac_eda_ext; // issue dodaac

		// Vendor Name, Vendor DUNS, and Vendor CAGE
		result.vendor_name_eda_ext = data.vendor_name_eda_ext;
		result.vendor_duns_eda_ext = data.vendor_duns_eda_ext;
		result.vendor_cage_eda_ext = data.vendor_cage_eda_ext;

		// Contract Admin Agency Name and Contract Admin Office DoDAAC
		const adminPresent = data.contract_issue_office_dodaac_eda_ext != data.contract_admin_office_dodaac_eda_ext;
		if (adminPresent) {
			result.contract_admin_name_eda_ext = data.contract_admin_agency_name_eda_ext;
			result.contract_admin_office_dodaac_eda_ext = data.contract_admin_office_dodaac_eda_ext; // admin dodaac
		}

		// Paying Office
		result.paying_office_name_eda_ext = data.contract_payment_office_name_eda_ext;
		result.paying_office_dodaac_eda_ext = data.contract_payment_office_dodaac_eda_ext; // paying dodaac

		// Modifications
		result.modification_eda_ext = data.modification_number_eda_ext;

		// Award ID and Reference IDV
		result.award_id_eda_ext = data.award_id_eda_ext;
		if (data.award_id_eda_ext?.length === 4) {
			result.award_id_eda_ext = data.referenced_idv_eda_ext + '-' + data.award_id_eda_ext;
		}

		result.reference_idv_eda_ext = data.referenced_idv_eda_ext;

		// Signature Date and Effective Date
		result.signature_date_eda_ext = data.signature_date_eda_ext_dt;
		result.effective_date_eda_ext = data.effective_date_eda_ext_dt;

		// Obligated Amounts
		result.obligated_amounts_eda_ext = data.total_obligated_amount_eda_ext_f;

		// NAICS
		result.naics_eda_ext = data.naics_eda_ext;
		result.issuing_organization_eda_ext = data.dodaac_org_type_eda_ext;

		// get paying, admin, issue
		if (data.vendor_org_hierarchy_eda_n?.vendor_org_eda_ext_n) {
			const orgData = data.vendor_org_hierarchy_eda_n.vendor_org_eda_ext_n;

			for (const org of orgData) {
				if (org.dodaac_eda_ext) {
					result = this.setMajcoms(org, result, adminPresent);
				}
			}
		}

		return result;
	}

	getEDAContractQuery(user, award = '', idv = '', isAward = false, isSearch = false) {
		try {
			let query = {
				_source: {
					includes: [
						'extracted_data_eda_n.modification_number_eda_ext',
						'extracted_data_eda_n.signature_date_eda_ext_dt',
						'extracted_data_eda_n.effective_date_eda_ext_dt',
					],
				},
				from: 0,
				size: 10000,
				track_total_hits: true,
				query: {
					bool: {
						must: [
							{
								nested: {
									path: 'extracted_data_eda_n',
									query: {
										bool: {
											must: [
												{
													match: {
														'extracted_data_eda_n.award_id_eda_ext': {
															query: award,
														},
													},
												},
											],
										},
									},
								},
							},
						],
					},
				},
			};

			if (idv !== '') {
				query.query.bool.must.push({
					nested: {
						path: 'extracted_data_eda_n',
						query: {
							bool: {
								must: [
									{
										match: {
											'extracted_data_eda_n.referenced_idv_eda_ext': {
												query: idv,
											},
										},
									},
								],
							},
						},
					},
				});
			}

			if (isAward) {
				query.query.bool.must.push({
					match: {
						mod_identifier_eda_ext: 'base_award',
					},
				});
			}

			if (isSearch || isAward) {
				query._source.includes = ['pagerank_r', 'kw_doc_score_r', 'orgs_rs', '*_eda_n*'];
				query.stored_fields = [
					'filename',
					'title',
					'page_count',
					'doc_type',
					'doc_num',
					'ref_list',
					'id',
					'summary_30',
					'keyw_5',
					'p_text',
					'type',
					'p_page',
					'display_title_s',
					'display_org_s',
					'display_doc_type_s',
					'metadata_type_eda_ext',
				];
			}
			return query;
		} catch (err) {
			this.logger.error(err, 'S5PJASQ', user);
		}
	}

	splitAwardID(awardID) {
		// award ID can be a combination of 2 fields
		const awardIDSplit = awardID.split('-');
		let id = '';
		let idv = '';
		if (awardIDSplit.length > 1) {
			id = awardIDSplit[1];
			idv = awardIDSplit[0];
		} else {
			id = awardID;
		}

		return { id, idv };
	}

	getESSimilarityQuery(pages, filters) {
		let filterQueries = [{ match: { sow_pws_populated_b: 'true' } }];
		filterQueries = filterQueries.concat(this.getEDASearchQuery(filters));

		const pagesQuery = pages.map((page) => {
			return {
				nested: {
					score_mode: 'max',
					path: 'pages',
					query: {
						match: { 'pages.p_raw_text': page.text },
					},
					inner_hits: {
						_source: false,
						stored_fields: ['pages.filename', 'pages.p_raw_text'],
						from: 0,
						size: 5,
						name: page.id.toString(),
						highlight: {
							fields: {
								'pages.filename.search': {
									number_of_fragments: 0,
								},
								'pages.p_raw_text': {
									fragment_size: 2,
									number_of_fragments: 1,
								},
							},
							fragmenter: 'span',
						},
					},
				},
			};
		});

		return {
			track_total_hits: 10000,
			size: 10,
			_source: {
				includes: ['pagerank_r', 'kw_doc_score_r', 'orgs_rs', 'file_location_eda_ext'],
			},
			stored_fields: [
				'filename',
				'title',
				'page_count',
				'doc_type',
				'doc_num',
				'ref_list',
				'id',
				'summary_30',
				'keyw_5',
				'p_text',
				'type',
				'p_page',
				'display_title_s',
				'display_org_s',
				'display_doc_type_s',
				'is_revoked_b',
				'access_timestamp_dt',
				'publication_date_dt',
				'crawler_used_s',
				'topics_s',
			],
			query: {
				bool: {
					must: filterQueries,
					should: pagesQuery,
				},
			},
		};
	}
}

module.exports = EDASearchUtility;
