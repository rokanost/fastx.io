let mysql_config = {
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USERNAME,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  ssl: "Amazon RDS",
  dateStrings: true,
  charset: "utf8mb4_unicode_ci",
  decimalNumbers: true,
  serverId: isProductionDomain ? 1 : Math.floor(Math.random() * (1000 - 1) + 1),
  pool: true,
  minInterval: 2000,
  connectionLimit: 8
};
LiveDb = new LiveMysql(mysql_config);

getLiveDbConnectionSync = Meteor.wrapAsync(LiveDb.pool.getConnection, LiveDb.pool);

LiveDb.pool.on('connection', function (connection) {
  console.log("BusinessLiveDb: New connection - Thread ID is: " + connection.threadId);
});

queryLiveDb = (query, args) => {
    let poolDbConnection;
    let result;
    try {
      poolDbConnection = getLiveDbConnectionSync();
      let poolDbConnectionExecSync = Meteor.wrapAsync(poolDbConnection.execute, poolDbConnection);
      result = poolDbConnectionExecSync(query, args);
      poolDbConnection.release();
    }
    catch(err) {
      if (poolDbConnection != null) poolDbConnection.release();
      throw(err);
    }

    return result;
}


DBSyncWrapper = function()
{
	this.connection = getLiveDbConnectionSync();
	this.execute = Meteor.wrapAsync(this.connection.execute, this.connection);
	this.commit = Meteor.wrapAsync(this.connection.commit, this.connection);
	this.beginTransaction = Meteor.wrapAsync(this.connection.beginTransaction, this.connection);
	this.rollback = Meteor.wrapAsync(this.connection.rollback, this.connection);
	this.release = function() { this.connection.release(); this.connection = null; };
	this.commitrelease = function() { this.commit(); this.release(); this.connection = null; };
	this.rollbackrelease = function() { this.rollback(); this.release(); this.connection = null; };
};


let closeAndExit = () => {
  LiveDb.end();
  process.exit();
};

// Close connections on hot code push
process.on("SIGTERM", closeAndExit);
// Close connections on exit (ctrl + c)
process.on("SIGINT", closeAndExit);
