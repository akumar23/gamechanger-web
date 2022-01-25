import React from 'react';
import Hermes from '../../../images/logos/HermesLogo.png';
import NFR from '../../../images/logos/NFRLogo.png';
import NGA from '../../../images/logos/NGALogo.png';
import SpaceForce from '../../../images/logos/SpaceForceLogo.png';
import Covid19 from '../../../images/logos/Covid19Logo.png';


const DefaultTitleBarHandler = {
	getTitleBar: (props) => {
		const { onTitleClick, componentStepNumbers, cloneData } = props;
		if (cloneData.display_name==='NGA'){
			return (
				<div
				className={`tutorial-step-${
					componentStepNumbers[`${cloneData.display_name} Title`]
				}`}
				onClick={onTitleClick}
				>	
				<img
					src={NGA}
					style={styles.title}
					id={'titleButton'}
				/>
			</div>
			);
		} else if(cloneData.display_name==='Hermes'){
			return (
				<div
				className={`tutorial-step-${
					componentStepNumbers[`${cloneData.display_name} Title`]
				}`}
				onClick={onTitleClick}
				>	
				<img
					src={Hermes}
					style={styles.title}
					id={'titleButton'}
				/>
			</div>
			);
		} else if(cloneData.display_name==='NFR'){
			return (
				<div
				className={`tutorial-step-${
					componentStepNumbers[`${cloneData.display_name} Title`]
				}`}
				onClick={onTitleClick}
				>	
				<img
					src={NFR}
					style={styles.title}
					id={'titleButton'}
				/>
			</div>
			);
		} else if(cloneData.display_name==='Space Force'){
			return (
				<div
				className={`tutorial-step-${
					componentStepNumbers[`${cloneData.display_name} Title`]
				}`}
				onClick={onTitleClick}
				>	
				<img
					src={SpaceForce}
					style={styles.title}
					id={'titleButton'}
				/>
			</div>
			);
		} else if(cloneData.display_name==='Covid-19'){
			return (
				<div
				className={`tutorial-step-${
					componentStepNumbers[`${cloneData.display_name} Title`]
				}`}
				onClick={onTitleClick}
				>	
				<img
					src={Covid19}
					style={styles.title}
					id={'titleButton'}
				/>
			</div>
			);
		} 
		
	},

	getCategoryTabs(props) {
		return <></>;
	},

	getTitleBarStyle(props) {
		const { rawSearchResults, pageDisplayed } = props;
		return {
			...styles.titleBar,
			borderBottom:
				rawSearchResults.length > 0 && pageDisplayed === 'main'
					? '2px solid rgb(176, 186, 197)'
					: '',
		};
	},
};

export default DefaultTitleBarHandler;

const styles = {
	wording: {
		color: '#131E43',
		marginRight: 15,
	},
	titleBar: {
		padding: '0 1em',
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		flex: 1,
		minHeight: 80,
		width: '100%',
	},
};