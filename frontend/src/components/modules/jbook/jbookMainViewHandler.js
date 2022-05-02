import React, { useEffect, useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import GetQAResults from '../default/qaResults';
import ViewHeader from '../../mainView/ViewHeader';
import { Card } from '../../cards/GCCard';
import LoadingIndicator from '@dod-advana/advana-platform-ui/dist/loading/LoadingIndicator';
import GameChangerSearchMatrix from '../../searchMetrics/GCSearchMatrix';
import { Typography } from '@material-ui/core';
import Pagination from 'react-js-pagination';
import {
	getQueryVariable,
	getTrackingNameForFactory,
	PAGE_DISPLAYED,
	scrollToContentTop,
	StyledCenterContainer,
} from '../../../utils/gamechangerUtils';
import { trackEvent } from '../../telemetry/Matomo';
import { getNonMainPageOuterContainer, setState } from '../../../utils/sharedFunctions';
import { getUserProfilePage, styles } from '../default/defaultMainViewHandler';
import './jbook.css';
import JBookWelcome from '../../aboutUs/JBookWelcomeModal';
import FeedbackModal from './jbookFeedbackModal';
import { handleTabClicked, populateDropDowns } from './jbookMainViewHelper';
import ResultView from '../../mainView/ResultView';
import GameChangerAPI from '../../api/gameChanger-service-api';
import GCToggle from '../../common/GCToggleSwitch';
import Permissions from '@dod-advana/advana-platform-ui/dist/utilities/permissions';
import SearchHandlerFactory from '../../factories/searchHandlerFactory';
import LoadableVisibility from 'react-loadable-visibility/react-loadable';
import JBookUserDashboard from './userProfile/jbookUserDashboard';

const _ = require('lodash');

const gameChangerAPI = new GameChangerAPI();

export const GC_COLORS = {
	primary: '#1C2D65',
	secondary: '#E9691D',
};

const JBookAboutUs = LoadableVisibility({
	loader: () => import('../../aboutUs/JBookAboutUs'),
	loading: () => {
		return <LoadingIndicator customColor={GC_COLORS.secondary} />;
	},
});

const JBookSideBar = LoadableVisibility({
	loader: () => import('./jbookSideBar'),
	loading: () => {
		return <LoadingIndicator customColor={GC_COLORS.secondary} />;
	},
});

const getSearchResults = (searchResultData, state, dispatch, module = null) => {
	return _.map(searchResultData, (item, idx) => {
		item.type = 'document';
		return <Card key={idx} item={item} idx={idx} state={state} dispatch={dispatch} card_module={module} />;
	});
};

const handlePageLoad = async (props) => {
	const { dispatch, state } = props;

	gameChangerAPI.updateClonesVisited(state.cloneData.clone_name);

	const { jbookSearchSettings, defaultOptions, dropdownData } = await populateDropDowns(state, dispatch);

	const url = window.location.href;
	const searchText = getQueryVariable('q', url) ?? '';
	let mainTabSelected = 0;
	// if (window.location.hash.indexOf('#/jbook/checklist') !== -1) {
	// 	mainTabSelected = 1;
	// }
	// the main setstate that triggers the initial search
	setState(dispatch, {
		searchText,
		loading: true,
		runSearch: true,
		mainTabSelected,
		urlSearch: true,
		jbookSearchSettings,
		defaultOptions: { ...state.defaultOptions, ...defaultOptions },
		dropdownData,
	});
};

const renderHideTabs = (props) => {
	return <></>;
};

const getMainView = (props) => {
	const { state, dispatch, getViewPanels, pageLoaded } = props;

	const { loading, rawSearchResults, viewNames, currentViewName } = state;

	const noResults = Boolean(!rawSearchResults || rawSearchResults?.length === 0);
	const hideSearchResults = noResults && loading;

	return (
		<>
			<FeedbackModal state={state} dispatch={dispatch} />
			<JBookWelcome dispatch={dispatch} state={state} />
			{loading &&
				currentViewName === undefined && ( // initial loading indicator when site has not populated yet
					<div style={{ margin: '0 auto' }}>
						<LoadingIndicator customColor={GC_COLORS.primary} />
					</div>
				)}
			{!hideSearchResults && pageLoaded && (
				<div style={{ ...styles.tabButtonContainer, backgroundColor: '#ffffff', paddingTop: 20 }}>
					<ResultView context={{ state, dispatch }} viewNames={viewNames} viewPanels={getViewPanels()} />
					<div style={styles.spacer} />
				</div>
			)}
		</>
	);
};

const getViewNames = (props) => {
	return [{ name: 'Card', title: 'Card View', id: 'gcCardView' }];
};

const getExtraViewPanels = (props) => {
	return [];
};

const getCardViewPanel = (props) => {
	const { context } = props;
	const { state, dispatch } = context;
	const {
		componentStepNumbers,
		count,
		resultsPage,
		hideTabs,
		iframePreviewLink,
		loading,
		showSideFilters,
		rawSearchResults,
		mainTabSelected,
		runningSearch,
		edaSearchResults,
		edaLoading,
		edaCloneData,
		edaResultsPage,
		edaCount,
	} = state;

	let sideScroll = {
		height: '72vh',
	};
	if (!iframePreviewLink) sideScroll = {};

	return (
		<div key={'cardView'}>
			<div key={'cardView'} style={{ marginTop: hideTabs ? 40 : 'auto' }}>
				<div>
					<div id="game-changer-content-top" />

					<StyledCenterContainer showSideFilters={showSideFilters}>
						<div className={'top-container'}>
							<div style={{ padding: 10, zIndex: 99 }}>
								{Permissions.permissionValidator(`Gamechanger Super Admin`, true) && (
									<GCToggle
										onClick={() => {
											setState(dispatch, {
												useElasticSearch: !state.useElasticSearch,
												runSearch: true,
											});
										}}
										rightActive={state.useElasticSearch}
										leftLabel={'Use PG'}
										rightLabel={'Use ES'}
										customColor={GC_COLORS.primary}
									/>
								)}
							</div>

							{!hideTabs && <ViewHeader {...props} extraStyle={{ marginRight: -15, marginTop: 5 }} />}
						</div>
						{showSideFilters && (
							<div className={'left-container'} style={{ marginTop: -65 }}>
								<div className={'side-bar-container'}>
									<GameChangerSearchMatrix context={context} />
									{state.expansionDict && Object.keys(state.expansionDict).length > 0 && (
										<>
											<div className={'sidebar-section-title'} style={{ marginLeft: 5 }}>
												RELATED
											</div>
											<JBookSideBar context={context} cloneData={state.cloneData} />
										</>
									)}
								</div>
							</div>
						)}

						<div className={'right-container'} style={{ marginTop: -75 }}>
							<div
								className={`row tutorial-step-${componentStepNumbers['Search Results Section']} card-container`}
								style={{ padding: 0 }}
							>
								<div className={'col-xs-12'} style={{ ...sideScroll, padding: 0 }}>
									<div className="row" style={{ marginLeft: 0, marginRight: 0, padding: 0 }}>
										{false && !loading && <GetQAResults context={context} />}
									</div>
									<div className={'col-xs-12'} style={{ ...sideScroll, padding: 0 }}>
										<Tabs selectedIndex={mainTabSelected ?? 0}>
											<div
												style={{
													...styles.tabButtonContainer,
													backgroundColor: '#ffffff',
													paddingTop: 20,
													background: 'transparent',
												}}
											>
												<TabList style={styles.tabsList}>
													<div style={{ flex: 1, display: 'flex' }}>
														<Tab
															style={{
																...styles.tabStyle,
																...(mainTabSelected === 0
																	? styles.tabSelectedStyle
																	: {}),
																borderRadius: `5px 5px 0 0`,
															}}
															title="summaryFAQ"
															onClick={() => handleTabClicked(dispatch, state, 0)}
														>
															<Typography
																variant="h6"
																display="inline"
																title="jbookSearch"
															>
																JBOOK SEARCH ({count})
															</Typography>
														</Tab>
														{(Permissions.permissionValidator(
															`${edaCloneData.clone_name} Admin`,
															true
														) ||
															Permissions.permissionValidator(
																`View ${edaCloneData.clone_name}`,
																true
															)) && (
															<Tab
																style={{
																	...styles.tabStyle,
																	...(mainTabSelected === 1
																		? styles.tabSelectedStyle
																		: {}),
																	borderRadius: `5px 5px 0 0`,
																}}
																title="reviewerChecklist"
																onClick={() => handleTabClicked(dispatch, state, 1)}
															>
																<Typography
																	variant="h6"
																	display="inline"
																	title="contractSearch"
																>
																	CONTRACT SEARCH
																</Typography>
															</Tab>
														)}
													</div>
												</TabList>

												<div style={styles.panelContainer}>
													<TabPanel>
														{runningSearch && (
															<div style={{ margin: '0 auto' }}>
																<LoadingIndicator customColor={GC_COLORS.primary} />
															</div>
														)}
														{!runningSearch && (
															<div className="row" style={{ padding: 5 }}>
																{getSearchResults(
																	rawSearchResults ? rawSearchResults : [],
																	state,
																	dispatch
																)}
																<div className="jbookPagination col-xs-12 text-center">
																	<Pagination
																		activePage={resultsPage}
																		itemsCountPerPage={18}
																		totalItemsCount={count}
																		pageRangeDisplayed={8}
																		onChange={(page) => {
																			console.log('jbook pagination search');
																			trackEvent(
																				getTrackingNameForFactory(
																					state.cloneData.clone_name
																				),
																				'PaginationChanged',
																				'page',
																				page
																			);
																			setState(dispatch, {
																				resultsPage: page,
																				runSearch: true,
																				loading: true,
																				paginationSearch: true,
																			});
																			scrollToContentTop();
																		}}
																	/>
																</div>
															</div>
														)}
													</TabPanel>
													<TabPanel>
														{(Permissions.permissionValidator(
															`${edaCloneData.clone_name} Admin`,
															true
														) ||
															Permissions.permissionValidator(
																`View ${edaCloneData.clone_name}`,
																true
															)) && (
															<>
																{edaLoading && (
																	<div style={{ margin: '0 auto' }}>
																		<LoadingIndicator
																			customColor={GC_COLORS.primary}
																		/>
																	</div>
																)}
																{!edaLoading && (
																	<div className="row" style={{ padding: 5 }}>
																		{getSearchResults(
																			edaSearchResults ? edaSearchResults : [],
																			state,
																			dispatch,
																			edaCloneData.card_module
																		)}
																		<div className="jbookPagination col-xs-12 text-center">
																			<Pagination
																				activePage={edaResultsPage}
																				itemsCountPerPage={18}
																				totalItemsCount={edaCount}
																				pageRangeDisplayed={8}
																				onChange={(page) => {
																					trackEvent(
																						getTrackingNameForFactory(
																							edaCloneData.clone_name
																						),
																						'PaginationChanged',
																						'page',
																						page
																					);
																					setState(dispatch, {
																						edaResultsPage: page,
																						runSearch: true,
																						edaPaginationSearch: true,
																					});
																					scrollToContentTop();
																				}}
																			/>
																		</div>
																	</div>
																)}
															</>
														)}
													</TabPanel>
												</div>
											</div>
										</Tabs>
										{/*
													<div className="col-xs-12">
														<LoadingIndicator customColor={gcOrange} />
													</div>
										*/}
									</div>
								</div>
							</div>
						</div>
					</StyledCenterContainer>
				</div>
			</div>
		</div>
	);
};

const getAboutUs = (props) => {
	return <JBookAboutUs />;
};

const displayUserRelatedItems = () => {
	return <JBookUserDashboard />;
};

const JBookMainViewHandler = (props) => {
	const { state, dispatch, cancelToken, setCurrentTime } = props;

	const [pageLoaded, setPageLoaded] = useState(false);

	useEffect(() => {
		if (state.cloneDataSet && state.historySet && !pageLoaded) {
			const searchFactory = new SearchHandlerFactory(state.cloneData.search_module);
			const searchHandler = searchFactory.createHandler();

			handlePageLoad({ state, dispatch, history: state.history, searchHandler, cancelToken });
			setState(dispatch, { viewNames: getViewNames({ cloneData: state.cloneData }) });
			setPageLoaded(true);
		}
	}, [cancelToken, dispatch, pageLoaded, state]);

	const getViewPanels = () => {
		const viewPanels = { Card: getCardViewPanel({ context: { state, dispatch } }) };

		const extraViewPanels = getExtraViewPanels({ context: { state, dispatch } });
		extraViewPanels.forEach(({ panelName, panel }) => {
			viewPanels[panelName] = panel;
		});

		return viewPanels;
	};

	switch (state.pageDisplayed) {
		case PAGE_DISPLAYED.userDashboard:
			return getNonMainPageOuterContainer(getUserProfilePage(displayUserRelatedItems), state, dispatch);
		case PAGE_DISPLAYED.aboutUs:
			return getNonMainPageOuterContainer(getAboutUs, state, dispatch);
		case PAGE_DISPLAYED.main:
		default:
			return getMainView({
				state,
				dispatch,
				setCurrentTime,
				renderHideTabs,
				pageLoaded,
				getViewPanels,
			});
	}
};

export default JBookMainViewHandler;
