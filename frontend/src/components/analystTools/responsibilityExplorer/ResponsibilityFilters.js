import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { TextField } from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import GCAccordion from '../../common/GCAccordion';
import GCButton from '../../common/GCButton';
import styled from 'styled-components';
import { trackEvent } from '../../telemetry/Matomo';
import { getTrackingNameForFactory } from '../../../utils/gamechangerUtils';

const AccordianWrapper = styled.div`
	.MuiAccordionSummary-root {
		display: flex !important;
		padding: 0px 10px !important;
	}
	.MuiIconButton-edgeEnd {
		margin-right: -12px;
	}
	.MuiIconButton-root {
		padding: 12px;
	}
`;

const useStyles = makeStyles({
	root: {
		width: '100%',
		'&[class*="MuiAutocomplete-root"] [class*="MuiOutlinedInput-root"]': {
			paddingRight: '45px !important',
		},
	},
});

const trackingAction = 'ResponsibilityExplorer-FilterChange';

export default function ResponsibilityFilters({
	filters,
	documentList,
	docTitle,
	setDocTitle,
	organization,
	setOrganization,
	responsibilityText,
	setResponsibilityText,
	setFilters,
	setResultsPage,
	setReloadResponsibilities,
	setCollapseKeys,
	cloneData,
}) {
	const [clearFilters, setClearFilters] = useState(false);

	const handleRespFilterChange = (e) => {
		if (e.target.value) {
			setResponsibilityText({
				id: 'responsibilityText',
				value: e.target.value,
			});
		} else {
			setResponsibilityText({});
		}
	};

	const trackingCategory = getTrackingNameForFactory(cloneData.clone_name);

	const classes = useStyles();

	return (
		<>
			<div style={{ fontSize: 16, marginBottom: 10, fontFamily: 'Montserrat', fontWeight: '600' }}>
				FILTERS {filters.length ? <span style={{ color: '#ed691d' }}>{`(${filters.length})`}</span> : ''}
			</div>
			<div style={{ width: '100%' }}>
				<div style={{ width: '100%', marginBottom: 10 }}>
					<AccordianWrapper>
						<GCAccordion
							expanded={filters.find((filter) => filter.id === 'documentTitle') ? true : false}
							header={
								<span>
									DOCUMENT TITLE{' '}
									{filters.filter((f) => f.id === 'documentTitle').length ? (
										<span style={{ color: '#ed691d' }}>{`(${
											filters.filter((f) => f.id === 'documentTitle').length
										})`}</span>
									) : (
										''
									)}
								</span>
							}
							headerBackground={'rgb(238,241,242)'}
							headerTextColor={'black'}
							headerTextWeight={'normal'}
						>
							<Autocomplete
								classes={{ root: classes.root }}
								key={clearFilters}
								multiple
								options={documentList}
								disableClearable
								getOptionLabel={(option) => option.documentTitle}
								defaultValue={docTitle}
								onChange={(_event, newValue) => {
									setDocTitle(newValue);
								}}
								renderInput={(params) => (
									<TextField
										{...params}
										classes={{ root: classes.root }}
										variant="outlined"
										label="Document Titles"
									/>
								)}
							/>
						</GCAccordion>
					</AccordianWrapper>
				</div>
				<div style={{ width: '100%', marginBottom: 10 }}>
					<AccordianWrapper>
						<GCAccordion
							expanded={
								filters.find((filter) => filter.id === 'organizationPersonnelText') ? true : false
							}
							header={
								<span>
									ENTITY{' '}
									{filters.filter((f) => f.id === 'organizationPersonnelText').length ? (
										<span style={{ color: '#ed691d' }}>{`(${
											filters.filter((f) => f.id === 'organizationPersonnelText').length
										})`}</span>
									) : (
										''
									)}
								</span>
							}
							headerBackground={'rgb(238,241,242)'}
							headerTextColor={'black'}
							headerTextWeight={'normal'}
						>
							<Autocomplete
								classes={{ root: classes.root }}
								key={clearFilters}
								multiple
								options={[]}
								disableClearable
								freeSolo
								autoSelect
								getOptionLabel={(option) => option}
								defaultValue={organization}
								value={organization}
								onChange={(_event, newValue) => {
									setOrganization(newValue);
								}}
								renderInput={(params) => (
									<TextField
										{...params}
										classes={{ root: classes.root }}
										variant="outlined"
										label="Entities"
									/>
								)}
							/>
						</GCAccordion>
					</AccordianWrapper>
				</div>
				<div style={{ width: '100%', marginBottom: 10 }}>
					<AccordianWrapper>
						<GCAccordion
							expanded={filters.find((filter) => filter.id === 'responsibilityText') ? true : false}
							header={
								<span>
									RESPONSIBILITY TEXT{' '}
									{filters.filter((f) => f.id === 'responsibilityText').length ? (
										<span style={{ color: '#ed691d' }}>{`(${
											filters.filter((f) => f.id === 'responsibilityText').length
										})`}</span>
									) : (
										''
									)}
								</span>
							}
							headerBackground={'rgb(238,241,242)'}
							headerTextColor={'black'}
							headerTextWeight={'normal'}
						>
							<div style={{ width: '100%' }}>
								<TextField
									classes={{ root: classes.root }}
									variant="outlined"
									placeholder="Responsibility Text"
									value={responsibilityText?.value || ''}
									onChange={handleRespFilterChange}
								/>
							</div>
						</GCAccordion>
					</AccordianWrapper>
					<GCButton
						onClick={() => {
							setResponsibilityText({});
							setOrganization([]);
							setDocTitle([]);
							setClearFilters(!clearFilters);
							setFilters([]);
							setResultsPage(1);
							setReloadResponsibilities(true);
							trackEvent(trackingCategory, trackingAction, 'onClickClearFiltersButton');
						}}
						style={{ display: 'block', width: '100%', margin: '20px 0 10px 0' }}
						isSecondaryBtn
					>
						Clear Filters
					</GCButton>
					<GCButton
						onClick={() => {
							const newFilters = [];
							if (Object.keys(responsibilityText).length) newFilters.push(responsibilityText);
							if (organization.length) {
								organization.forEach((org) => {
									newFilters.push({ id: 'organizationPersonnelText', value: org });
								});
							}
							if (docTitle.length) {
								docTitle.forEach((doc) => {
									newFilters.push({ id: 'documentTitle', value: doc.documentTitle });
								});
							}
							setCollapseKeys({});
							setFilters(newFilters);
							setResultsPage(1);
							setReloadResponsibilities(true);

							let eventName = newFilters
								.map((item) => `category:${item.id}, value:${item.value}`)
								.join(' -- ');
							!eventName && (eventName = 'filtersEmpty');
							trackEvent(trackingCategory, trackingAction, eventName);
						}}
						style={{ display: 'block', width: '100%', margin: 0 }}
					>
						Update Search
					</GCButton>
				</div>
			</div>
		</>
	);
}
