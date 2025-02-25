import React, { useContext, useEffect } from 'react';
import GCTooltip from '../../common/GCToolTip';
import { HoverNavItem, NavItem } from '../../navigation/NavItems';
import { trackEvent } from '../../telemetry/Matomo';
import { getCloneTitleForFactory, getTrackingNameForFactory, PAGE_DISPLAYED } from '../../../utils/gamechangerUtils';
import { ConstrainedIcon, PageLink, StyledBadgeSmall } from '@dod-advana/advana-side-nav/dist/SlideOutMenu';
import BellIcon from '../../../images/icon/NewNotificationsIcon.png';
import { setState } from '../../../utils/sharedFunctions';
import AppTutorialsIcon from '../../../images/icon/AppTutorialsIcon.png';
import UserFeedbackIcon from '../../../images/icon/UserFeedbackIcon.png';
import CrowdSourcingAppIcon from '../../../images/icon/NewCrowdSourcingIcon.png';
import DataStatusTrackerIcon from '../../../images/icon/NewDataStatusTrackerIcon.png';
import AnalystToolsIcon from '../../../images/icon/analyticswht.png';
import Permissions from '@dod-advana/advana-platform-ui/dist/utilities/permissions';
import AdminIcon from '../../../images/icon/NewAdminIcon.png';
import { getNotifications } from '../../notifications/Notifications';
import GamechangerCDOLogo from '../../../images/logos/CDO-Sidemenu.png';
import GamechangerHermesLogo from '../../../images/logos/Hermes-Sidemenu.png';
import GamechangerNGALogo from '../../../images/logos/NGA-Sidemenu.png';
import GamechangerNFRLogo from '../../../images/logos/NFR-Sidemenu.png';
import GamechangerSFLogo from '../../../images/logos/SF-Sidemenu.png';
import GamechangerCovid19Logo from '../../../images/logos/Covid19-Sidemenu.png';
import { Typography } from '@material-ui/core';
import SlideOutMenuContent from '@dod-advana/advana-side-nav/dist/SlideOutMenuContent';
import { SlideOutToolContext } from '@dod-advana/advana-side-nav/dist/SlideOutMenuContext';
import PropTypes from 'prop-types';

const styles = {
	wording: {
		color: 'white',
		marginRight: 15,
	},
};

const getToolTheme = (cloneData) => {
	let toolStyles = {
		menuBackgroundColor: '#171A23',
		logoBackgroundColor: '#000000',
		openCloseButtonBackgroundColor: '#000000',
		allAppsBackgroundColor: '#171A23',
		openCloseIconColor: '#FFFFFF',
		sectionSeparatorColor: '#323E4A',
		fontColor: '#FFFFFF',
		hoverColor: '#E9691D',
	};
	if (cloneData.display_name === 'NGA') {
		return {
			...toolStyles,
			toolLogo: <img src={GamechangerNGALogo} href="#/gamechanger" alt="tool logo" />,
			toolIconHref: `#/${cloneData?.clone_data?.url || ''}`,
		};
	} else if (cloneData.display_name === 'Hermes') {
		return {
			...toolStyles,
			toolLogo: <img src={GamechangerHermesLogo} href="#/gamechanger" alt="tool logo" />,
			toolIconHref: `#/${cloneData?.clone_data?.url || ''}`,
		};
	} else if (cloneData.display_name === 'NFR') {
		return {
			...toolStyles,
			toolLogo: <img src={GamechangerNFRLogo} href="#/gamechanger" alt="tool logo" />,
			toolIconHref: `#/${cloneData?.clone_data?.url || ''}`,
		};
	} else if (cloneData.display_name === 'Space Force') {
		return {
			...toolStyles,
			toolLogo: <img src={GamechangerSFLogo} href="#/gamechanger" alt="tool logo" />,
			toolIconHref: `#/${cloneData?.clone_data?.url || ''}`,
		};
	} else if (cloneData.display_name === 'CDO') {
		return {
			...toolStyles,
			toolLogo: <img src={GamechangerCDOLogo} href="#/gamechanger" alt="tool logo" />,
			toolIconHref: `#/${cloneData?.clone_data?.url || ''}`,
		};
	} else if (cloneData.display_name === 'Covid-19') {
		return {
			...toolStyles,
			toolLogo: <img src={GamechangerCovid19Logo} href="#/gamechanger" alt="tool logo" />,
			toolIconHref: `#/${cloneData?.clone_data?.url || ''}`,
		};
	} else {
		return {
			...toolStyles,
			toolLogo: (
				<div>
					<Typography variant="h1" style={{ ...styles.wording, margin: '0 15px 0 0' }}>
						{getCloneTitleForFactory(cloneData, false)}
					</Typography>
					<Typography
						variant="h6"
						style={{
							...styles.wording,
							textAlign: 'center',
							margin: '0 15px 0 0',
						}}
					>
						Powered by GAMECHANGER
					</Typography>
				</div>
			),
			toolIconHref: `#/${cloneData?.clone_data?.url || ''}`,
		};
	}
};

const getToolState = (state) => {
	return {
		knowledgeBaseHref: 'https://wiki.advana.data.mil',
		toolTheme: getToolTheme(state.cloneData),
		toolName: state.cloneData?.clone_name?.toUpperCase() || '',
		hideAllApplicationsSection: false,
		hideContentSection: false,
		extraSupportLinks: [],
		associatedApplications: [],
	};
};

const clickNotification = (state, dispatch) => {
	getNotifications(dispatch);
	trackEvent(getTrackingNameForFactory(state.cloneData.clone_name), 'SidebarInteraction', 'ShowNotifications');
};

const clickTutorial = (state, dispatch) => {
	setState(dispatch, {
		showTutorial: true,
		clickedTutorial: true,
	});
	trackEvent(getTrackingNameForFactory(state.cloneData.clone_name), 'SidebarInteraction', 'ShowTutorial');
};

const generateClosedContentArea = (state, dispatch) => {
	const toolTheme = getToolTheme(state.cloneData);
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
			}}
		>
			{state.notificationIds.length > 0 && (
				<GCTooltip title="Show Notifications" placement="right" arrow>
					<HoverNavItem
						centered
						onClick={() => {
							clickNotification(state, dispatch);
						}}
						toolTheme={toolTheme}
					>
						{/* <NotificationsClosed src={BellIcon} notificationCount={state.notifications.length} /> */}
						<ConstrainedIcon src={BellIcon} />
					</HoverNavItem>
				</GCTooltip>
			)}
			{state.cloneData?.show_tutorial && Object.keys(state.componentStepNumbers).length > 0 && (
				<GCTooltip title="How-to, features, and tips" placement="right" arrow>
					<HoverNavItem
						centered
						onClick={() => {
							clickTutorial(state, dispatch);
						}}
						toolTheme={toolTheme}
					>
						<StyledBadgeSmall
							color="secondary"
							badgeContent=" "
							invisible={!state.newUser || state.clickedTutorial}
						>
							<ConstrainedIcon src={AppTutorialsIcon} />
						</StyledBadgeSmall>
					</HoverNavItem>
				</GCTooltip>
			)}
			<GCTooltip title="User Feedback" placement="right" arrow>
				<HoverNavItem
					centered
					onClick={() => {
						setState(dispatch, { showFeedbackModal: true });
						trackEvent(
							getTrackingNameForFactory(state.cloneData.clone_name),
							'SidebarInteraction',
							'showUserFeedback'
						);
					}}
					toolTheme={toolTheme}
				>
					<ConstrainedIcon src={UserFeedbackIcon} />
				</HoverNavItem>
			</GCTooltip>
			{state.cloneData?.show_crowd_source && (
				<GCTooltip title="Crowd Sourcing" placement="right" arrow>
					<HoverNavItem
						centered
						onClick={() => {
							setState(dispatch, { showAssistModal: true });
							trackEvent(
								getTrackingNameForFactory(state.cloneData.clone_name),
								'SidebarInteraction',
								'CrowdSourcing'
							);
						}}
						toolTheme={toolTheme}
					>
						<ConstrainedIcon src={CrowdSourcingAppIcon} />
					</HoverNavItem>
				</GCTooltip>
			)}
			{state.cloneData?.show_data_tracker && (
				<GCTooltip title="Data Status Tracker" placement="right" arrow>
					<HoverNavItem
						centered
						onClick={() => {
							window.history.pushState(
								null,
								document.title,
								`/#/${state.cloneData.url.toLowerCase()}/${PAGE_DISPLAYED.dataTracker}`
							);
							setState(dispatch, {
								pageDisplayed: PAGE_DISPLAYED.dataTracker,
							});
							trackEvent(
								getTrackingNameForFactory(state.cloneData.clone_name),
								'SidebarInteraction',
								'showDataTracker'
							);
						}}
						active={state.pageDisplayed === PAGE_DISPLAYED.dataTracker}
						toolTheme={toolTheme}
					>
						<ConstrainedIcon src={DataStatusTrackerIcon} />
					</HoverNavItem>
				</GCTooltip>
			)}
			{state.cloneData?.show_analyst_tools && (
				<GCTooltip title="Analyst Tools" placement="right" arrow>
					<HoverNavItem
						centered
						onClick={() => {
							window.history.pushState(
								null,
								document.title,
								`/#/${state.cloneData.url.toLowerCase()}/${PAGE_DISPLAYED.analystTools}`
							);
							setState(dispatch, {
								pageDisplayed: PAGE_DISPLAYED.analystTools,
							});
							trackEvent(
								getTrackingNameForFactory(state.cloneData.clone_name),
								'showResponsibilityTracker',
								'onCLick'
							);
						}}
						active={state.pageDisplayed === PAGE_DISPLAYED.analystTools}
						toolTheme={toolTheme}
					>
						<ConstrainedIcon src={AnalystToolsIcon} />
					</HoverNavItem>
				</GCTooltip>
			)}
			{Permissions.permissionValidator(`${state.cloneData.clone_name} Admin`, true) && (
				<GCTooltip title="Admin Page" placement="right" arrow>
					<PageLink href={`#/${state.cloneData.url}/admin`} centered style={{ width: '100%' }}>
						<HoverNavItem centered toolTheme={toolTheme}>
							<ConstrainedIcon src={AdminIcon} />
						</HoverNavItem>
					</PageLink>
				</GCTooltip>
			)}
		</div>
	);
};

const generateOpenedContentArea = (state, dispatch) => {
	const toolTheme = getToolTheme(state.cloneData);
	return (
		<div style={{ display: 'flex', flexDirection: 'column' }}>
			{state.notificationIds.length > 0 && (
				<GCTooltip title="Show Notifications" placement="right" arrow>
					<HoverNavItem
						onClick={() => {
							clickNotification(state, dispatch);
						}}
						toolTheme={toolTheme}
					>
						{/* <Notifications src={BellIcon} notificationCount={state.notifications.length} /> */}
						<ConstrainedIcon src={BellIcon} />
						<span style={{ marginLeft: '10px' }}>Notifications</span>
					</HoverNavItem>
				</GCTooltip>
			)}
			<NavItem style={{ justifyContent: 'space-between' }}>
				<span>{getCloneTitleForFactory(state.cloneData, true)} MENU</span>
			</NavItem>
			{state.cloneData?.show_tutorial && Object.keys(state.componentStepNumbers).length > 0 && (
				<GCTooltip title="How-to, features, and tips" placement="right" arrow>
					<HoverNavItem
						onClick={() => {
							clickTutorial(state, dispatch);
						}}
						toolTheme={toolTheme}
					>
						<StyledBadgeSmall
							color="secondary"
							badgeContent=" "
							invisible={!state.newUser || state.clickedTutorial}
						>
							<ConstrainedIcon src={AppTutorialsIcon} />
						</StyledBadgeSmall>
						<span style={{ marginLeft: '10px' }}>Guided Tutorial</span>
					</HoverNavItem>
				</GCTooltip>
			)}
			<GCTooltip title="Tell us what you think!" placement="right" arrow>
				<HoverNavItem
					onClick={() => {
						setState(dispatch, { showFeedbackModal: true });
						trackEvent(
							getTrackingNameForFactory(state.cloneData.clone_name),
							'SidebarInteraction',
							'showUserFeedbackSelected'
						);
					}}
					toolTheme={toolTheme}
				>
					<ConstrainedIcon src={UserFeedbackIcon} />
					<span style={{ marginLeft: '10px' }}>User Feedback</span>
				</HoverNavItem>
			</GCTooltip>
			{state.cloneData?.show_crowd_source && (
				<GCTooltip title="Help us verify data" placement="right" arrow>
					<HoverNavItem
						onClick={() => {
							setState(dispatch, { showAssistModal: true });
							trackEvent(
								getTrackingNameForFactory(state.cloneData.clone_name),
								'SidebarInteraction',
								'CrowdSourcingSelected'
							);
						}}
						toolTheme={toolTheme}
					>
						<ConstrainedIcon src={CrowdSourcingAppIcon} />
						<span style={{ marginLeft: '10px' }}>Crowd Sourcing</span>
					</HoverNavItem>
				</GCTooltip>
			)}
			{state.cloneData?.show_data_tracker && (
				<GCTooltip title="Data Status Tracker" placement="right" arrow>
					<HoverNavItem
						onClick={() => {
							setState(dispatch, {
								pageDisplayed: PAGE_DISPLAYED.dataTracker,
							});
							trackEvent(
								getTrackingNameForFactory(state.cloneData.clone_name),
								'SidebarInteraction',
								'DataTrackerSelected'
							);
						}}
						active={state.pageDisplayed === PAGE_DISPLAYED.dataTracker}
						toolTheme={toolTheme}
					>
						<ConstrainedIcon src={DataStatusTrackerIcon} />
						<span style={{ marginLeft: '10px' }}>Data Status Tracker</span>
					</HoverNavItem>
				</GCTooltip>
			)}
			{state.cloneData?.show_analyst_tools && (
				<GCTooltip title="Analyst Tools" placement="right" arrow>
					<HoverNavItem
						onClick={() => {
							setState(dispatch, {
								pageDisplayed: PAGE_DISPLAYED.analystTools,
							});
							trackEvent('DataTracker', 'onCLick');
						}}
						active={state.pageDisplayed === PAGE_DISPLAYED.analystTools}
						toolTheme={toolTheme}
					>
						<ConstrainedIcon src={AnalystToolsIcon} />
						<span style={{ marginLeft: '10px' }}>Analyst Tools</span>
					</HoverNavItem>
				</GCTooltip>
			)}
			{Permissions.permissionValidator(`${state.cloneData.clone_name} Admin`, true) && (
				<GCTooltip title="Admin Page" placement="right" arrow>
					<PageLink href={`#/${state.cloneData.url}/admin`}>
						<HoverNavItem toolTheme={toolTheme}>
							<ConstrainedIcon src={AdminIcon} />
							<span style={{ marginLeft: '10px' }}>Admin Page</span>
						</HoverNavItem>
					</PageLink>
				</GCTooltip>
			)}
		</div>
	);
};

const DefaultNavigationHandler = (props) => {
	const { state, dispatch } = props;

	const { setToolState, unsetTool } = useContext(SlideOutToolContext);

	useEffect(() => {
		setToolState(getToolState(state));

		return () => {
			unsetTool();
		};
	}, [unsetTool, setToolState, state]);

	return (
		<>
			<SlideOutMenuContent type="closed">{generateClosedContentArea(state, dispatch)}</SlideOutMenuContent>
			<SlideOutMenuContent type="open">{generateOpenedContentArea(state, dispatch)}</SlideOutMenuContent>
		</>
	);
};

DefaultNavigationHandler.propTypes = {
	state: PropTypes.shape({
		cloneData: PropTypes.object,
		componentStepNumbers: PropTypes.array,
	}),
	dispatch: PropTypes.func,
};

export default DefaultNavigationHandler;
