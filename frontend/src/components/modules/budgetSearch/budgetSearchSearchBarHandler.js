import React from 'react';
import {
	SearchBarForm,
	SearchBarInput,
	SearchButton,
} from '../../searchBar/SearchBarStyledComponents';
import SearchBarDropdown from '../../searchBar/SearchBarDropdown';
import GCButton from '../../common/GCButton';
import { PAGE_DISPLAYED } from '../../../gamechangerUtils';
import { ConstrainedIcon } from '@dod-advana/advana-side-nav/dist/SlideOutMenu';
import UserIcon from '../../../images/icon/UserIcon.png';
import Popover from '@material-ui/core/Popover';
import TextField from '@material-ui/core/TextField';
import {
	setState,
	getUserData,
	clearDashboardNotification,
} from '../../../sharedFunctions';
import GCTooltip from '../../common/GCToolTip';
import GameChangerAPI from '../../api/gameChanger-service-api';
const gameChangerAPI = new GameChangerAPI();
const inputBorder = '1px solid lightgrey';

const DefaultSearchBarHandler = {
	async debouncedFetchSearchSuggestions(
		value,
		cloneData,
		setAutocorrect,
		setPresearchTitle,
		setPresearchTopic,
		setPresearchOrg,
		setPredictions
	) {
		try {
			const index = cloneData?.clone_data?.esCluster ?? '';
			const { data } = await gameChangerAPI.getTextSuggestion({
				index,
				searchText: value,
			});
			setAutocorrect(data?.autocorrect?.map((item) => ({ text: item })) ?? []);
			setPresearchTitle(
				data?.presearchTitle?.map((item) => ({ text: item })) ?? []
			);
			setPresearchTopic(
				data?.presearchTopic?.map((item) => ({ text: item })) ?? []
			);
			setPresearchOrg(data?.presearchOrg?.map((item) => ({ text: item })) ?? []);
			setPredictions(data?.predictions?.map((item) => ({ text: item })) ?? []);
		} catch (e) {
			console.log('default debouncedFetchSearchSuggestions err', e);
		}
	},
	getSearchBar(props) {
		const {
			state,
			dispatch,
			classes,
			searchFavoritePopperAnchorEl,
			advancedSearchOpen,
			dropdownOpen,
			ref,
			handleSubmit,
			handleKeyDown,
			handleOnType,
			handleOnBlur,
			searchText,
			setDropdownOpen,
			handleFavoriteSearchClicked,
			dataRows,
			cursor,
			searchFavoritePopperOpen,
			favoriteName,
			setFavoriteName,
			setFavoriteSummary,
			favoriteSummary,
			handleSaveSearch,
		} = props;

		return (
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					width: '100%',
					position: 'relative',
				}}
				ref={ref}
			>
				<SearchBarForm
					id="GamechangerSearchBarForm"
					className={
						state.componentStepNumbers
							? `tutorial-step-${state.componentStepNumbers['Search Input']}`
							: null
					}
					onSubmit={handleSubmit}
					autoComplete="off"
					onKeyDown={handleKeyDown}
				>
					<SearchBarInput
						type="text"
						value={searchText}
						onChange={handleOnType}
						onBlur={handleOnBlur}
						onFocus={() => {
							setDropdownOpen(true);
						}}
						placeholder="Search..."
						id="gcSearchInput"
					/>

					<GCTooltip
						title={'Favorite a search to track in the User Dashboard'}
						placement="top"
						arrow
					>
						<button
							type="button"
							style={{
								border: inputBorder,
								borderLeft: 'none',
								height: 50,
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
								backgroundColor: 'white',
								padding: '0 15px',
							}}
							onClick={(event) =>
								handleFavoriteSearchClicked(event.target, state.isFavoriteSearch)
							}
						>
							<i
								className={state.isFavoriteSearch ? 'fa fa-star' : 'fa fa-star-o'}
								style={{
									color: state.isFavoriteSearch ? '#E9691D' : 'rgb(224, 224, 224)',
									cursor: 'pointer',
									fontSize: 26,
								}}
							/>
						</button>
					</GCTooltip>
					{dropdownOpen && !advancedSearchOpen && (
						<SearchBarDropdown
							searchText={searchText}
							rowData={dataRows}
							cursor={cursor}
						/>
					)}
				</SearchBarForm>
				<SearchButton
					backgroundColor={'#9E9E9E'}
					id="gcSearchButton"
					onClick={handleSubmit}
				>
					<i className="fa fa-search" />
				</SearchButton>

				<GCButton
					onClick={() => {
						getUserData(dispatch);
						setState(dispatch, { pageDisplayed: PAGE_DISPLAYED.userDashboard });
						clearDashboardNotification('total', state, dispatch);
					}}
					style={{
						height: 50,
						width: 60,
						minWidth: 'none',
						padding: '0 18px',
						margin: '0 0 0 4%',
						backgroundColor: '#131E43',
						border: '#131E43',
					}}
				>
					<ConstrainedIcon src={UserIcon} />
				</GCButton>

				<Popover
					onClose={() => {
						handleFavoriteSearchClicked(null);
					}}
					open={searchFavoritePopperOpen}
					anchorEl={searchFavoritePopperAnchorEl}
					anchorOrigin={{
						vertical: 'bottom',
						horizontal: 'right',
					}}
					transformOrigin={{
						vertical: 'top',
						horizontal: 'right',
					}}
				>
					<div className={classes.paper}>
						<div style={{ width: 330, margin: 5 }}>
							<TextField
								label={'Favorite Name'}
								value={favoriteName}
								onChange={(event) => {
									setFavoriteName(event.target.value);
								}}
								className={classes.textField}
								margin="none"
								size="small"
								variant="outlined"
							/>
							<TextField
								label={'Favorite Summary'}
								value={favoriteSummary}
								onChange={(event) => {
									setFavoriteSummary(event.target.value);
								}}
								className={classes.textArea}
								margin="none"
								size="small"
								variant="outlined"
								multiline={true}
								rows={4}
							/>
							<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
								<GCButton
									onClick={() => handleFavoriteSearchClicked(null)}
									style={{
										height: 40,
										minWidth: 40,
										padding: '2px 8px 0px',
										fontSize: 14,
										margin: '16px 0px 0px 10px',
									}}
									isSecondaryBtn={true}
								>
									Cancel
								</GCButton>
								<GCButton
									onClick={() => handleSaveSearch(true)}
									style={{
										height: 40,
										minWidth: 40,
										padding: '2px 8px 0px',
										fontSize: 14,
										margin: '16px 0px 0px 10px',
									}}
								>
									Save
								</GCButton>
							</div>
						</div>
					</div>
				</Popover>
			</div>
		);
	},
};

export default DefaultSearchBarHandler;
