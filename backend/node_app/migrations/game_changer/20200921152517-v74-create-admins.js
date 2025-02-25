'use strict';
const tablename = 'admins';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return queryInterface.createTable(tablename, {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			username: {
				type: Sequelize.STRING,
			},
		});
	},
	down: (queryInterface, _Sequelize) => {
		return queryInterface.dropTable(tablename);
	},
};
