-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `modx_active_users` (
	`sid` varchar(32) NOT NULL DEFAULT '',
	`internalKey` int(9) NOT NULL DEFAULT 0,
	`username` varchar(50) NOT NULL DEFAULT '',
	`lasthit` int(20) NOT NULL DEFAULT 0,
	`action` varchar(10) NOT NULL DEFAULT '',
	`id` int(10)
);
--> statement-breakpoint
CREATE TABLE `modx_active_user_locks` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`sid` varchar(32) NOT NULL DEFAULT '',
	`internalKey` int(9) NOT NULL DEFAULT 0,
	`elementType` int(1) NOT NULL DEFAULT 0,
	`elementId` int(10) NOT NULL DEFAULT 0,
	`lasthit` int(20) NOT NULL DEFAULT 0,
	CONSTRAINT `ix_element_id` UNIQUE(`elementType`,`elementId`,`sid`)
);
--> statement-breakpoint
CREATE TABLE `modx_active_user_sessions` (
	`sid` varchar(32) NOT NULL DEFAULT '',
	`internalKey` int(9) NOT NULL DEFAULT 0,
	`lasthit` int(20) NOT NULL DEFAULT 0,
	`ip` varchar(50) NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `modx_categories` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`category` varchar(45) NOT NULL DEFAULT '',
	`rank` int(5) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_diabecinn2013` (
	`date` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`id` int(10) NOT NULL,
	`user` varchar(255) NOT NULL,
	`jatek` text NOT NULL,
	`ok` int(1) NOT NULL,
	CONSTRAINT `id` UNIQUE(`id`)
);
--> statement-breakpoint
CREATE TABLE `modx_diabpont2014` (
	`date` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`id` int(10) NOT NULL,
	`user` varchar(255) NOT NULL,
	`jatek` text NOT NULL,
	`ok` int(1) NOT NULL,
	CONSTRAINT `id` UNIQUE(`id`)
);
--> statement-breakpoint
CREATE TABLE `modx_diaeuro2014` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`count` int(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_diaeuro2014_player` (
	`uid` int(10) NOT NULL,
	`player` varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_diaeuro2014_toto` (
	`uid` int(10) NOT NULL,
	`date` int(10) NOT NULL,
	`time` int(255) NOT NULL,
	`tipp` char(1) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_diaeuro2015` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`count` int(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_diaeuro2015_player` (
	`uid` int(10) NOT NULL,
	`player` varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_diaeuro2015_toto` (
	`uid` int(10) NOT NULL,
	`date` int(10) NOT NULL,
	`time` int(255) NOT NULL,
	`tipp` char(1) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_diaeuro2016_toto` (
	`uid` int(10) NOT NULL,
	`date` int(10) NOT NULL,
	`time` int(255) NOT NULL,
	`tipp` char(1) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_diaeuro2017_toto` (
	`uid` int(10) NOT NULL,
	`date` int(10) NOT NULL,
	`time` int(255) NOT NULL,
	`tipp` char(1) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_diaeuro2018_toto` (
	`uid` varchar(100) NOT NULL,
	`date` int(10) NOT NULL,
	`time` int(255) NOT NULL,
	`tipp` char(1) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_documentgroup_names` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`name` varchar(245) NOT NULL DEFAULT '',
	`private_memgroup` tinyint DEFAULT 0,
	`private_webgroup` tinyint DEFAULT 0,
	CONSTRAINT `name` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `modx_document_groups` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`document_group` int(10) NOT NULL DEFAULT 0,
	`document` int(10) NOT NULL DEFAULT 0,
	CONSTRAINT `ix_dg_id` UNIQUE(`document_group`,`document`)
);
--> statement-breakpoint
CREATE TABLE `modx_event_log` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`eventid` int(11) DEFAULT 0,
	`createdon` int(11) NOT NULL DEFAULT 0,
	`type` tinyint NOT NULL DEFAULT 1,
	`user` int(11) NOT NULL DEFAULT 0,
	`usertype` tinyint NOT NULL DEFAULT 0,
	`source` varchar(50) NOT NULL DEFAULT '',
	`description` text
);
--> statement-breakpoint
CREATE TABLE `modx_fd_count` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`filename` text,
	`count` int(10) DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_geokviz2014` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`jatek` text NOT NULL,
	`ok` int(1) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_jegkrem2012` (
	`date` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`id` int(10) NOT NULL,
	`user` varchar(255) NOT NULL,
	`jatek` text NOT NULL,
	`ok` int(1) NOT NULL,
	CONSTRAINT `id` UNIQUE(`id`)
);
--> statement-breakpoint
CREATE TABLE `modx_jot_content` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`title` varchar(255),
	`tagid` varchar(50),
	`published` int(1) NOT NULL DEFAULT 0,
	`uparent` int(10) NOT NULL DEFAULT 0,
	`parent` int(10) NOT NULL DEFAULT 0,
	`flags` varchar(25),
	`secip` varchar(32),
	`sechash` varchar(32),
	`content` mediumtext,
	`customfields` mediumtext,
	`mode` int(1) NOT NULL DEFAULT 1,
	`createdby` int(10) NOT NULL DEFAULT 0,
	`createdon` int(20) NOT NULL DEFAULT 0,
	`editedby` int(10) NOT NULL DEFAULT 0,
	`editedon` int(20) NOT NULL DEFAULT 0,
	`deleted` int(1) NOT NULL DEFAULT 0,
	`deletedon` int(20) NOT NULL DEFAULT 0,
	`deletedby` int(10) NOT NULL DEFAULT 0,
	`publishedon` int(20) NOT NULL DEFAULT 0,
	`publishedby` int(10) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_jot_fields` (
	`id` mediumint(10) NOT NULL,
	`label` varchar(50) NOT NULL,
	`content` text
);
--> statement-breakpoint
CREATE TABLE `modx_jot_subscriptions` (
	`id` mediumint(10) AUTO_INCREMENT NOT NULL,
	`uparent` mediumint(10) NOT NULL DEFAULT 0,
	`tagid` varchar(50) NOT NULL DEFAULT '',
	`userid` mediumint(10) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_keyword_xref` (
	`content_id` int(11) NOT NULL DEFAULT 0,
	`keyword_id` int(11) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_manager_log` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`timestamp` int(20) NOT NULL DEFAULT 0,
	`internalKey` int(10) NOT NULL DEFAULT 0,
	`username` varchar(255),
	`action` int(10) NOT NULL DEFAULT 0,
	`itemid` varchar(10) DEFAULT 0,
	`itemname` varchar(255),
	`message` varchar(255) NOT NULL DEFAULT '',
	`ip` varchar(46),
	`useragent` varchar(255)
);
--> statement-breakpoint
CREATE TABLE `modx_manager_users` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL DEFAULT '',
	`password` varchar(100) NOT NULL DEFAULT '',
	CONSTRAINT `username` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `modx_membergroup_access` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`membergroup` int(10) NOT NULL DEFAULT 0,
	`documentgroup` int(10) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_membergroup_names` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`name` varchar(245) NOT NULL DEFAULT '',
	CONSTRAINT `name` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `modx_member_groups` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`user_group` int(10) NOT NULL DEFAULT 0,
	`member` int(10) NOT NULL DEFAULT 0,
	CONSTRAINT `ix_group_member` UNIQUE(`user_group`,`member`)
);
--> statement-breakpoint
CREATE TABLE `modx_page_hit_counter` (
	`page_id` int(4) unsigned NOT NULL DEFAULT 0,
	`page_count` int(10) unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `page_id` UNIQUE(`page_id`)
);
--> statement-breakpoint
CREATE TABLE `modx_recepted` (
	`internalKey` int(10) NOT NULL,
	`user` varchar(255) NOT NULL,
	`nev` varchar(255) NOT NULL,
	`cv` text NOT NULL,
	`foto` varchar(255) NOT NULL,
	`etel1` varchar(255) NOT NULL,
	`hozzavalok1` text NOT NULL,
	`elkeszites1` text NOT NULL,
	`adag1` varchar(255) NOT NULL,
	`foto1_1` varchar(255) NOT NULL,
	`foto1_2` varchar(255) NOT NULL,
	`foto1_3` varchar(255) NOT NULL,
	`etel2` varchar(255) NOT NULL,
	`hozzavalok2` text NOT NULL,
	`elkeszites2` text NOT NULL,
	`adag2` varchar(255) NOT NULL,
	`foto2_1` varchar(255) NOT NULL,
	`foto2_2` varchar(255) NOT NULL,
	`foto2_3` varchar(255) NOT NULL,
	`etel3` varchar(255) NOT NULL,
	`hozzavalok3` text NOT NULL,
	`elkeszites3` text NOT NULL,
	`adag3` varchar(255) NOT NULL,
	`foto3_1` varchar(255) NOT NULL,
	`foto3_2` varchar(255) NOT NULL,
	`foto3_3` varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_receptek2015` (
	`internalKey` int(10) AUTO_INCREMENT NOT NULL,
	`user` varchar(255) NOT NULL,
	`nev` varchar(255) NOT NULL,
	`etel1` varchar(255) NOT NULL,
	`hozzavalok1` text NOT NULL,
	`elkeszites1` text NOT NULL,
	`adag1` varchar(255) NOT NULL,
	`foto1_1` varchar(255) NOT NULL,
	`foto1_2` varchar(255) NOT NULL,
	`foto1_3` varchar(255) NOT NULL,
	`etel2` varchar(255) NOT NULL,
	`hozzavalok2` text NOT NULL,
	`elkeszites2` text NOT NULL,
	`adag2` varchar(255) NOT NULL,
	`foto2_1` varchar(255) NOT NULL,
	`foto2_2` varchar(255) NOT NULL,
	`foto2_3` varchar(255) NOT NULL,
	`etel3` varchar(255) NOT NULL,
	`hozzavalok3` text NOT NULL,
	`elkeszites3` text NOT NULL,
	`adag3` varchar(255) NOT NULL,
	`foto3_1` varchar(255) NOT NULL,
	`foto3_2` varchar(255) NOT NULL,
	`foto3_3` varchar(255) NOT NULL,
	CONSTRAINT `internalKey` UNIQUE(`internalKey`)
);
--> statement-breakpoint
CREATE TABLE `modx_receptek2016` (
	`internalKey` int(10) AUTO_INCREMENT NOT NULL,
	`user` varchar(255) NOT NULL,
	`nev` varchar(255) NOT NULL,
	`kitolto` varchar(255) NOT NULL,
	`klub` varchar(255) NOT NULL,
	`etel1` varchar(255) NOT NULL,
	`hozzavalok1` text NOT NULL,
	`elkeszites1` text NOT NULL,
	`adag1` varchar(255) NOT NULL,
	`foto1_1` varchar(255) NOT NULL,
	`foto1_2` varchar(255) NOT NULL,
	`foto1_3` varchar(255) NOT NULL,
	`etel2` varchar(255) NOT NULL,
	`hozzavalok2` text NOT NULL,
	`elkeszites2` text NOT NULL,
	`adag2` varchar(255) NOT NULL,
	`foto2_1` varchar(255) NOT NULL,
	`foto2_2` varchar(255) NOT NULL,
	`foto2_3` varchar(255) NOT NULL,
	`etel3` varchar(255) NOT NULL,
	`hozzavalok3` text NOT NULL,
	`elkeszites3` text NOT NULL,
	`adag3` varchar(255) NOT NULL,
	`foto3_1` varchar(255) NOT NULL,
	`foto3_2` varchar(255) NOT NULL,
	`foto3_3` varchar(255) NOT NULL,
	CONSTRAINT `internalKey` UNIQUE(`internalKey`)
);
--> statement-breakpoint
CREATE TABLE `modx_receptek2017` (
	`internalKey` int(10) AUTO_INCREMENT NOT NULL,
	`user` varchar(255) NOT NULL,
	`nev` varchar(255) NOT NULL,
	`kitolto` varchar(255) NOT NULL,
	`klub` varchar(255) NOT NULL,
	`etel1` varchar(255) NOT NULL,
	`hozzavalok1` text NOT NULL,
	`elkeszites1` text NOT NULL,
	`adag1` varchar(255) NOT NULL,
	`foto1_1` varchar(255) NOT NULL,
	`foto1_2` varchar(255) NOT NULL,
	`foto1_3` varchar(255) NOT NULL,
	`etel2` varchar(255) NOT NULL,
	`hozzavalok2` text NOT NULL,
	`elkeszites2` text NOT NULL,
	`adag2` varchar(255) NOT NULL,
	`foto2_1` varchar(255) NOT NULL,
	`foto2_2` varchar(255) NOT NULL,
	`foto2_3` varchar(255) NOT NULL,
	`etel3` varchar(255) NOT NULL,
	`hozzavalok3` text NOT NULL,
	`elkeszites3` text NOT NULL,
	`adag3` varchar(255) NOT NULL,
	`foto3_1` varchar(255) NOT NULL,
	`foto3_2` varchar(255) NOT NULL,
	`foto3_3` varchar(255) NOT NULL,
	CONSTRAINT `internalKey` UNIQUE(`internalKey`)
);
--> statement-breakpoint
CREATE TABLE `modx_receptek2018` (
	`internalKey` int(10) AUTO_INCREMENT NOT NULL,
	`user` varchar(255) NOT NULL,
	`nev` varchar(255) NOT NULL,
	`kitolto` varchar(255) NOT NULL,
	`klub` varchar(255) NOT NULL,
	`etel1` varchar(255) NOT NULL,
	`hozzavalok1` text NOT NULL,
	`elkeszites1` text NOT NULL,
	`adag1` varchar(255) NOT NULL,
	`foto1_1` varchar(255) NOT NULL,
	`foto1_2` varchar(255) NOT NULL,
	`foto1_3` varchar(255) NOT NULL,
	`etel2` varchar(255) NOT NULL,
	`hozzavalok2` text NOT NULL,
	`elkeszites2` text NOT NULL,
	`adag2` varchar(255) NOT NULL,
	`foto2_1` varchar(255) NOT NULL,
	`foto2_2` varchar(255) NOT NULL,
	`foto2_3` varchar(255) NOT NULL,
	`etel3` varchar(255) NOT NULL,
	`hozzavalok3` text NOT NULL,
	`elkeszites3` text NOT NULL,
	`adag3` varchar(255) NOT NULL,
	`foto3_1` varchar(255) NOT NULL,
	`foto3_2` varchar(255) NOT NULL,
	`foto3_3` varchar(255) NOT NULL,
	CONSTRAINT `internalKey` UNIQUE(`internalKey`)
);
--> statement-breakpoint
CREATE TABLE `modx_receptem` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`user` varchar(255) NOT NULL,
	`etel` varchar(255) NOT NULL,
	`hozzavalok` text NOT NULL,
	`elkeszites` text NOT NULL,
	`adag` varchar(255) NOT NULL,
	`foto1` varchar(255) NOT NULL,
	`foto2` varchar(255) NOT NULL,
	`foto3` varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_referers_counter` (
	`ref_url` varchar(255),
	`ref_count` int(10) unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `ref_url` UNIQUE(`ref_url`)
);
--> statement-breakpoint
CREATE TABLE `modx_site_content` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`type` varchar(20) NOT NULL DEFAULT 'document',
	`contentType` varchar(50) NOT NULL DEFAULT 'text/html',
	`pagetitle` varchar(255) NOT NULL DEFAULT '',
	`longtitle` varchar(255) NOT NULL DEFAULT '',
	`description` varchar(255) NOT NULL DEFAULT '',
	`alias` varchar(245) DEFAULT '',
	`link_attributes` varchar(255) NOT NULL DEFAULT '',
	`published` int(1) NOT NULL DEFAULT 0,
	`pub_date` int(20) NOT NULL DEFAULT 0,
	`unpub_date` int(20) NOT NULL DEFAULT 0,
	`parent` int(10) NOT NULL DEFAULT 0,
	`isfolder` int(1) NOT NULL DEFAULT 0,
	`introtext` text,
	`content` mediumtext,
	`richtext` tinyint NOT NULL DEFAULT 1,
	`template` int(10) NOT NULL DEFAULT 0,
	`menuindex` int(10) NOT NULL DEFAULT 0,
	`searchable` int(1) NOT NULL DEFAULT 1,
	`cacheable` int(1) NOT NULL DEFAULT 1,
	`createdby` int(10) NOT NULL DEFAULT 0,
	`createdon` int(20) NOT NULL DEFAULT 0,
	`editedby` int(10) NOT NULL DEFAULT 0,
	`editedon` int(20) NOT NULL DEFAULT 0,
	`deleted` int(1) NOT NULL DEFAULT 0,
	`deletedon` int(20) NOT NULL DEFAULT 0,
	`deletedby` int(10) NOT NULL DEFAULT 0,
	`publishedon` int(20) NOT NULL DEFAULT 0,
	`publishedby` int(10) NOT NULL DEFAULT 0,
	`menutitle` varchar(255) NOT NULL DEFAULT '',
	`donthit` tinyint NOT NULL DEFAULT 0,
	`haskeywords` tinyint NOT NULL DEFAULT 0,
	`hasmetatags` tinyint NOT NULL DEFAULT 0,
	`privateweb` tinyint NOT NULL DEFAULT 0,
	`privatemgr` tinyint NOT NULL DEFAULT 0,
	`content_dispo` tinyint NOT NULL DEFAULT 0,
	`hidemenu` tinyint NOT NULL DEFAULT 0,
	`alias_visible` int(2) NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `modx_site_content_metatags` (
	`content_id` int(11) NOT NULL DEFAULT 0,
	`metatag_id` int(11) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_site_htmlsnippets` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL DEFAULT '',
	`description` varchar(255) NOT NULL DEFAULT 'Chunk',
	`editor_type` int(11) NOT NULL DEFAULT 0,
	`editor_name` varchar(50) NOT NULL DEFAULT 'none',
	`category` int(11) NOT NULL DEFAULT 0,
	`cache_type` tinyint NOT NULL DEFAULT 0,
	`snippet` mediumtext,
	`locked` tinyint NOT NULL DEFAULT 0,
	`createdon` int(11) NOT NULL DEFAULT 0,
	`editedon` int(11) NOT NULL DEFAULT 0,
	`disabled` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_site_keywords` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`keyword` varchar(40) NOT NULL DEFAULT '',
	CONSTRAINT `keyword` UNIQUE(`keyword`)
);
--> statement-breakpoint
CREATE TABLE `modx_site_metatags` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL DEFAULT '',
	`tag` varchar(50) NOT NULL DEFAULT '',
	`tagvalue` varchar(255) NOT NULL DEFAULT '',
	`http_equiv` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_site_modules` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL DEFAULT '',
	`description` varchar(255) NOT NULL DEFAULT 0,
	`editor_type` int(11) NOT NULL DEFAULT 0,
	`disabled` tinyint NOT NULL DEFAULT 0,
	`category` int(11) NOT NULL DEFAULT 0,
	`wrap` tinyint NOT NULL DEFAULT 0,
	`locked` tinyint NOT NULL DEFAULT 0,
	`icon` varchar(255) NOT NULL DEFAULT '',
	`enable_resource` tinyint NOT NULL DEFAULT 0,
	`resourcefile` varchar(255) NOT NULL DEFAULT '',
	`createdon` int(11) NOT NULL DEFAULT 0,
	`editedon` int(11) NOT NULL DEFAULT 0,
	`guid` varchar(32) NOT NULL DEFAULT '',
	`enable_sharedparams` tinyint NOT NULL DEFAULT 0,
	`properties` text,
	`modulecode` mediumtext
);
--> statement-breakpoint
CREATE TABLE `modx_site_module_access` (
	`id` int(10) unsigned AUTO_INCREMENT NOT NULL,
	`module` int(11) NOT NULL DEFAULT 0,
	`usergroup` int(11) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_site_module_depobj` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`module` int(11) NOT NULL DEFAULT 0,
	`resource` int(11) NOT NULL DEFAULT 0,
	`type` int(2) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_site_plugins` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL DEFAULT '',
	`description` varchar(255) NOT NULL DEFAULT 'Plugin',
	`editor_type` int(11) NOT NULL DEFAULT 0,
	`category` int(11) NOT NULL DEFAULT 0,
	`cache_type` tinyint NOT NULL DEFAULT 0,
	`plugincode` mediumtext,
	`locked` tinyint NOT NULL DEFAULT 0,
	`properties` text,
	`disabled` tinyint NOT NULL DEFAULT 0,
	`moduleguid` varchar(32) NOT NULL DEFAULT '',
	`createdon` int(11) NOT NULL DEFAULT 0,
	`editedon` int(11) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_site_plugin_events` (
	`pluginid` int(10) NOT NULL,
	`evtid` int(10) NOT NULL DEFAULT 0,
	`priority` int(10) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_site_snippets` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL DEFAULT '',
	`description` varchar(255) NOT NULL DEFAULT 'Snippet',
	`editor_type` int(11) NOT NULL DEFAULT 0,
	`category` int(11) NOT NULL DEFAULT 0,
	`cache_type` tinyint NOT NULL DEFAULT 0,
	`snippet` mediumtext,
	`locked` tinyint NOT NULL DEFAULT 0,
	`properties` text,
	`moduleguid` varchar(32) NOT NULL DEFAULT '',
	`createdon` int(11) NOT NULL DEFAULT 0,
	`editedon` int(11) NOT NULL DEFAULT 0,
	`disabled` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_site_templates` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`templatename` varchar(50) NOT NULL DEFAULT '',
	`templatealias` varchar(255),
	`description` varchar(255) NOT NULL DEFAULT 'Template',
	`editor_type` int(11) NOT NULL DEFAULT 0,
	`category` int(11) NOT NULL DEFAULT 0,
	`icon` varchar(255) NOT NULL DEFAULT '',
	`template_type` int(11) NOT NULL DEFAULT 0,
	`content` mediumtext,
	`locked` tinyint NOT NULL DEFAULT 0,
	`selectable` tinyint NOT NULL DEFAULT 1,
	`editedon` int(11) NOT NULL DEFAULT 0,
	`createdon` int(11) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_site_tmplvars` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT '',
	`name` varchar(50) NOT NULL DEFAULT '',
	`caption` varchar(80) NOT NULL DEFAULT '',
	`description` varchar(255) NOT NULL DEFAULT '',
	`editor_type` int(11) NOT NULL DEFAULT 0,
	`category` int(11) NOT NULL DEFAULT 0,
	`locked` tinyint NOT NULL DEFAULT 0,
	`elements` text,
	`rank` int(11) NOT NULL DEFAULT 0,
	`display` varchar(20) NOT NULL DEFAULT '',
	`display_params` text,
	`default_text` text,
	`editedon` int(11) NOT NULL DEFAULT 0,
	`createdon` int(11) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_site_tmplvar_access` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`tmplvarid` int(10) NOT NULL DEFAULT 0,
	`documentgroup` int(10) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_site_tmplvar_contentvalues` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`tmplvarid` int(10) NOT NULL DEFAULT 0,
	`contentid` int(10) NOT NULL DEFAULT 0,
	`value` mediumtext,
	CONSTRAINT `ix_tvid_contentid` UNIQUE(`tmplvarid`,`contentid`)
);
--> statement-breakpoint
CREATE TABLE `modx_site_tmplvar_templates` (
	`tmplvarid` int(10) NOT NULL DEFAULT 0,
	`templateid` int(11) NOT NULL DEFAULT 0,
	`rank` int(11) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_system_eventnames` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL DEFAULT '',
	`service` tinyint NOT NULL DEFAULT 0,
	`groupname` varchar(20) NOT NULL DEFAULT '',
	CONSTRAINT `name` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `modx_system_settings` (
	`setting_name` varchar(50) NOT NULL DEFAULT '',
	`setting_value` text
);
--> statement-breakpoint
CREATE TABLE `modx_txnewsletters_usersdata` (
	`Company` varchar(255) NOT NULL DEFAULT '',
	`Name` varchar(255) NOT NULL DEFAULT '',
	`Phone` varchar(255) NOT NULL DEFAULT '',
	`Email` varchar(255) NOT NULL DEFAULT '',
	`Zipcode` varchar(20) NOT NULL DEFAULT '',
	`City` varchar(255) NOT NULL DEFAULT '',
	`Address` varchar(255) NOT NULL DEFAULT '',
	`Site` varchar(255) NOT NULL DEFAULT '',
	`Partner` varchar(64) NOT NULL DEFAULT '',
	`Timestamp` varchar(255) NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `modx_user_attributes` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`internalKey` int(10) NOT NULL DEFAULT 0,
	`fullname` varchar(100) NOT NULL DEFAULT '',
	`role` int(10) NOT NULL DEFAULT 0,
	`email` varchar(100) NOT NULL DEFAULT '',
	`phone` varchar(100) NOT NULL DEFAULT '',
	`mobilephone` varchar(100) NOT NULL DEFAULT '',
	`blocked` int(1) NOT NULL DEFAULT 0,
	`blockeduntil` int(11) NOT NULL DEFAULT 0,
	`blockedafter` int(11) NOT NULL DEFAULT 0,
	`logincount` int(11) NOT NULL DEFAULT 0,
	`lastlogin` int(11) NOT NULL DEFAULT 0,
	`thislogin` int(11) NOT NULL DEFAULT 0,
	`failedlogincount` int(10) NOT NULL DEFAULT 0,
	`sessionid` varchar(100) NOT NULL DEFAULT '',
	`dob` int(10) NOT NULL DEFAULT 0,
	`gender` int(1) NOT NULL DEFAULT 0,
	`country` varchar(5) NOT NULL DEFAULT '',
	`street` varchar(255) NOT NULL DEFAULT '',
	`city` varchar(255) NOT NULL DEFAULT '',
	`state` varchar(25) NOT NULL DEFAULT '',
	`zip` varchar(25) NOT NULL DEFAULT '',
	`fax` varchar(100) NOT NULL DEFAULT '',
	`photo` varchar(255) NOT NULL DEFAULT '',
	`comment` text,
	`editedon` int(11) NOT NULL DEFAULT 0,
	`createdon` int(11) NOT NULL DEFAULT 0,
	`verified` int(1) NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `modx_user_messages` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`type` varchar(15) NOT NULL DEFAULT '',
	`subject` varchar(60) NOT NULL DEFAULT '',
	`message` text,
	`sender` int(10) NOT NULL DEFAULT 0,
	`recipient` int(10) NOT NULL DEFAULT 0,
	`private` tinyint NOT NULL DEFAULT 0,
	`postdate` int(20) NOT NULL DEFAULT 0,
	`messageread` tinyint NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_user_roles` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL DEFAULT '',
	`description` varchar(255) NOT NULL DEFAULT '',
	`frames` int(1) NOT NULL DEFAULT 0,
	`home` int(1) NOT NULL DEFAULT 0,
	`view_document` int(1) NOT NULL DEFAULT 0,
	`new_document` int(1) NOT NULL DEFAULT 0,
	`save_document` int(1) NOT NULL DEFAULT 0,
	`publish_document` int(1) NOT NULL DEFAULT 0,
	`delete_document` int(1) NOT NULL DEFAULT 0,
	`empty_trash` int(1) NOT NULL DEFAULT 0,
	`action_ok` int(1) NOT NULL DEFAULT 0,
	`logout` int(1) NOT NULL DEFAULT 0,
	`help` int(1) NOT NULL DEFAULT 0,
	`messages` int(1) NOT NULL DEFAULT 0,
	`new_user` int(1) NOT NULL DEFAULT 0,
	`edit_user` int(1) NOT NULL DEFAULT 0,
	`logs` int(1) NOT NULL DEFAULT 0,
	`edit_parser` int(1) NOT NULL DEFAULT 0,
	`save_parser` int(1) NOT NULL DEFAULT 0,
	`edit_template` int(1) NOT NULL DEFAULT 0,
	`settings` int(1) NOT NULL DEFAULT 0,
	`credits` int(1) NOT NULL DEFAULT 0,
	`new_template` int(1) NOT NULL DEFAULT 0,
	`save_template` int(1) NOT NULL DEFAULT 0,
	`delete_template` int(1) NOT NULL DEFAULT 0,
	`edit_snippet` int(1) NOT NULL DEFAULT 0,
	`new_snippet` int(1) NOT NULL DEFAULT 0,
	`save_snippet` int(1) NOT NULL DEFAULT 0,
	`delete_snippet` int(1) NOT NULL DEFAULT 0,
	`edit_chunk` int(1) NOT NULL DEFAULT 0,
	`new_chunk` int(1) NOT NULL DEFAULT 0,
	`save_chunk` int(1) NOT NULL DEFAULT 0,
	`delete_chunk` int(1) NOT NULL DEFAULT 0,
	`empty_cache` int(1) NOT NULL DEFAULT 0,
	`edit_document` int(1) NOT NULL DEFAULT 0,
	`change_password` int(1) NOT NULL DEFAULT 0,
	`error_dialog` int(1) NOT NULL DEFAULT 0,
	`about` int(1) NOT NULL DEFAULT 0,
	`category_manager` int(1) NOT NULL DEFAULT 0,
	`file_manager` int(1) NOT NULL DEFAULT 0,
	`assets_images` int(1) NOT NULL DEFAULT 1,
	`assets_files` int(1) NOT NULL DEFAULT 1,
	`save_user` int(1) NOT NULL DEFAULT 0,
	`delete_user` int(1) NOT NULL DEFAULT 0,
	`save_password` int(11) NOT NULL DEFAULT 0,
	`edit_role` int(1) NOT NULL DEFAULT 0,
	`save_role` int(1) NOT NULL DEFAULT 0,
	`delete_role` int(1) NOT NULL DEFAULT 0,
	`new_role` int(1) NOT NULL DEFAULT 0,
	`access_permissions` int(1) NOT NULL DEFAULT 0,
	`bk_manager` int(1) NOT NULL DEFAULT 0,
	`new_plugin` int(1) NOT NULL DEFAULT 0,
	`edit_plugin` int(1) NOT NULL DEFAULT 0,
	`save_plugin` int(1) NOT NULL DEFAULT 0,
	`delete_plugin` int(1) NOT NULL DEFAULT 0,
	`new_module` int(1) NOT NULL DEFAULT 0,
	`edit_module` int(1) NOT NULL DEFAULT 0,
	`save_module` int(1) NOT NULL DEFAULT 0,
	`delete_module` int(1) NOT NULL DEFAULT 0,
	`exec_module` int(1) NOT NULL DEFAULT 0,
	`view_eventlog` int(1) NOT NULL DEFAULT 0,
	`delete_eventlog` int(1) NOT NULL DEFAULT 0,
	`manage_metatags` int(1) NOT NULL DEFAULT 0,
	`edit_doc_metatags` int(1) NOT NULL DEFAULT 0,
	`new_web_user` int(1) NOT NULL DEFAULT 0,
	`edit_web_user` int(1) NOT NULL DEFAULT 0,
	`save_web_user` int(1) NOT NULL DEFAULT 0,
	`delete_web_user` int(1) NOT NULL DEFAULT 0,
	`web_access_permissions` int(1) NOT NULL DEFAULT 0,
	`view_unpublished` int(1) NOT NULL DEFAULT 0,
	`import_static` int(1) NOT NULL DEFAULT 0,
	`export_static` int(1) NOT NULL DEFAULT 0,
	`remove_locks` int(1) NOT NULL DEFAULT 0,
	`change_resourcetype` int(1) NOT NULL DEFAULT 0,
	`display_locks` int(1) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_user_settings` (
	`user` int(11) NOT NULL,
	`setting_name` varchar(50) NOT NULL DEFAULT '',
	`setting_value` text
);
--> statement-breakpoint
CREATE TABLE `modx_webgroup_access` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`webgroup` int(10) NOT NULL DEFAULT 0,
	`documentgroup` int(10) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_webgroup_names` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`name` varchar(245) NOT NULL DEFAULT '',
	CONSTRAINT `name` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `modx_web_groups` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`webgroup` int(10) NOT NULL DEFAULT 0,
	`webuser` int(10) NOT NULL DEFAULT 0,
	CONSTRAINT `ix_group_user` UNIQUE(`webgroup`,`webuser`)
);
--> statement-breakpoint
CREATE TABLE `modx_web_users` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL DEFAULT '',
	`password` varchar(100) NOT NULL DEFAULT '',
	`cachepwd` varchar(100) NOT NULL DEFAULT '',
	CONSTRAINT `username` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `modx_web_user_attributes` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`internalKey` int(10) NOT NULL DEFAULT 0,
	`fullname` varchar(100) NOT NULL DEFAULT '',
	`role` int(10) NOT NULL DEFAULT 0,
	`email` varchar(100) NOT NULL DEFAULT '',
	`phone` varchar(100) NOT NULL DEFAULT '',
	`mobilephone` varchar(100) NOT NULL DEFAULT '',
	`blocked` int(1) NOT NULL DEFAULT 0,
	`blockeduntil` int(11) NOT NULL DEFAULT 0,
	`blockedafter` int(11) NOT NULL DEFAULT 0,
	`logincount` int(11) NOT NULL DEFAULT 0,
	`lastlogin` int(11) NOT NULL DEFAULT 0,
	`thislogin` int(11) NOT NULL DEFAULT 0,
	`failedlogincount` int(10) NOT NULL DEFAULT 0,
	`sessionid` varchar(100) NOT NULL DEFAULT '',
	`dob` int(10) NOT NULL DEFAULT 0,
	`gender` int(1) NOT NULL DEFAULT 0,
	`country` varchar(25) NOT NULL DEFAULT '',
	`street` varchar(255) NOT NULL DEFAULT '',
	`city` varchar(255) NOT NULL DEFAULT '',
	`state` varchar(25) NOT NULL DEFAULT '',
	`zip` varchar(25) NOT NULL DEFAULT '',
	`fax` varchar(100) NOT NULL DEFAULT '',
	`photo` varchar(255) NOT NULL DEFAULT '',
	`comment` text,
	`editedon` int(11) NOT NULL DEFAULT 0,
	`createdon` int(11) NOT NULL DEFAULT 0,
	`verified` int(1) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `modx_web_user_attributes_extended` (
	`id` int(10) AUTO_INCREMENT NOT NULL,
	`internalKey` int(10) NOT NULL,
	`diab_1` varchar(255) NOT NULL,
	`diab_2` varchar(255) NOT NULL,
	`diab_3` varchar(255) NOT NULL,
	`diab_4` varchar(255) NOT NULL,
	`diab_5` varchar(255) NOT NULL,
	`diab_6` varchar(255) NOT NULL,
	`diab_7` varchar(255) NOT NULL,
	`diab_8` varchar(255) NOT NULL,
	`diab_9` varchar(255) NOT NULL,
	`diab_0` varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modx_web_user_settings` (
	`webuser` int(11) NOT NULL,
	`setting_name` varchar(50) NOT NULL DEFAULT '',
	`setting_value` text
);
--> statement-breakpoint
CREATE INDEX `uid` ON `modx_diaeuro2014_player` (`uid`);--> statement-breakpoint
CREATE INDEX `uid` ON `modx_diaeuro2014_toto` (`uid`);--> statement-breakpoint
CREATE INDEX `uid` ON `modx_diaeuro2015_player` (`uid`);--> statement-breakpoint
CREATE INDEX `uid` ON `modx_diaeuro2015_toto` (`uid`);--> statement-breakpoint
CREATE INDEX `uid` ON `modx_diaeuro2016_toto` (`uid`);--> statement-breakpoint
CREATE INDEX `uid` ON `modx_diaeuro2017_toto` (`uid`);--> statement-breakpoint
CREATE INDEX `uid` ON `modx_diaeuro2018_toto` (`uid`);--> statement-breakpoint
CREATE INDEX `document` ON `modx_document_groups` (`document`);--> statement-breakpoint
CREATE INDEX `document_group` ON `modx_document_groups` (`document_group`);--> statement-breakpoint
CREATE INDEX `user` ON `modx_event_log` (`user`);--> statement-breakpoint
CREATE INDEX `parent` ON `modx_jot_content` (`parent`);--> statement-breakpoint
CREATE INDEX `secip` ON `modx_jot_content` (`secip`);--> statement-breakpoint
CREATE INDEX `tagidx` ON `modx_jot_content` (`tagid`);--> statement-breakpoint
CREATE INDEX `uparent` ON `modx_jot_content` (`uparent`);--> statement-breakpoint
CREATE INDEX `id` ON `modx_jot_fields` (`id`);--> statement-breakpoint
CREATE INDEX `label` ON `modx_jot_fields` (`label`);--> statement-breakpoint
CREATE INDEX `uparent` ON `modx_jot_subscriptions` (`uparent`);--> statement-breakpoint
CREATE INDEX `tagid` ON `modx_jot_subscriptions` (`tagid`);--> statement-breakpoint
CREATE INDEX `userid` ON `modx_jot_subscriptions` (`userid`);--> statement-breakpoint
CREATE INDEX `content_id` ON `modx_keyword_xref` (`content_id`);--> statement-breakpoint
CREATE INDEX `keyword_id` ON `modx_keyword_xref` (`keyword_id`);--> statement-breakpoint
CREATE INDEX `userid` ON `modx_recepted` (`internalKey`);--> statement-breakpoint
CREATE INDEX `id` ON `modx_site_content` (`id`);--> statement-breakpoint
CREATE INDEX `parent` ON `modx_site_content` (`parent`);--> statement-breakpoint
CREATE INDEX `aliasidx` ON `modx_site_content` (`alias`);--> statement-breakpoint
CREATE INDEX `typeidx` ON `modx_site_content` (`type`);--> statement-breakpoint
CREATE INDEX `content_ft_idx` ON `modx_site_content` (`pagetitle`,`description`,`content`);--> statement-breakpoint
CREATE INDEX `content_id` ON `modx_site_content_metatags` (`content_id`);--> statement-breakpoint
CREATE INDEX `metatag_id` ON `modx_site_content_metatags` (`metatag_id`);--> statement-breakpoint
CREATE INDEX `indx_rank` ON `modx_site_tmplvars` (`rank`);--> statement-breakpoint
CREATE INDEX `idx_tmplvarid` ON `modx_site_tmplvar_contentvalues` (`tmplvarid`);--> statement-breakpoint
CREATE INDEX `idx_id` ON `modx_site_tmplvar_contentvalues` (`contentid`);--> statement-breakpoint
CREATE INDEX `value_ft_idx` ON `modx_site_tmplvar_contentvalues` (`value`);--> statement-breakpoint
CREATE INDEX `userid` ON `modx_user_attributes` (`internalKey`);--> statement-breakpoint
CREATE INDEX `setting_name` ON `modx_user_settings` (`setting_name`);--> statement-breakpoint
CREATE INDEX `user` ON `modx_user_settings` (`user`);--> statement-breakpoint
CREATE INDEX `userid` ON `modx_web_user_attributes` (`internalKey`);--> statement-breakpoint
CREATE INDEX `userid` ON `modx_web_user_attributes_extended` (`internalKey`);--> statement-breakpoint
CREATE INDEX `setting_name` ON `modx_web_user_settings` (`setting_name`);--> statement-breakpoint
CREATE INDEX `webuserid` ON `modx_web_user_settings` (`webuser`);
*/