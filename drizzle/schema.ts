import { mysqlTable, /*mysqlSchema, AnyMySqlColumn,*/ varchar, int, unique, timestamp, text, index, char, tinyint, mediumint, mediumtext } from "drizzle-orm/mysql-core"
// import { sql } from "drizzle-orm"

export const modx_active_users = mysqlTable("modx_active_users", {
	sid: varchar("sid", { length: 32 }).default('').notNull(),
	internalKey: int("internalKey").default(0).notNull(),
	username: varchar("username", { length: 50 }).default('').notNull(),
	lasthit: int("lasthit").default(0).notNull(),
	action: varchar("action", { length: 10 }).default('').notNull(),
	id: int("id"),
});

export const modx_active_user_locks = mysqlTable("modx_active_user_locks", {
	id: int("id").autoincrement().notNull(),
	sid: varchar("sid", { length: 32 }).default('').notNull(),
	internalKey: int("internalKey").default(0).notNull(),
	elementType: int("elementType").default(0).notNull(),
	elementId: int("elementId").default(0).notNull(),
	lasthit: int("lasthit").default(0).notNull(),
},
(table) => {
	return {
		ix_element_id: unique("ix_element_id").on(table.elementType, table.elementId, table.sid),
	}
});

export const modx_active_user_sessions = mysqlTable("modx_active_user_sessions", {
	sid: varchar("sid", { length: 32 }).default('').notNull(),
	internalKey: int("internalKey").default(0).notNull(),
	lasthit: int("lasthit").default(0).notNull(),
	ip: varchar("ip", { length: 50 }).default('').notNull(),
});

export const modx_categories = mysqlTable("modx_categories", {
	id: int("id").autoincrement().notNull(),
	category: varchar("category", { length: 45 }).default('').notNull(),
	rank: int("rank").default(0).notNull(),
});

export const modx_diabecinn2013 = mysqlTable("modx_diabecinn2013", {
	date: timestamp("date", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	id: int("id").notNull(),
	user: varchar("user", { length: 255 }).notNull(),
	jatek: text("jatek").notNull(),
	ok: int("ok").notNull(),
},
(table) => {
	return {
		id: unique("id").on(table.id),
	}
});

export const modx_diabpont2014 = mysqlTable("modx_diabpont2014", {
	date: timestamp("date", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	id: int("id").notNull(),
	user: varchar("user", { length: 255 }).notNull(),
	jatek: text("jatek").notNull(),
	ok: int("ok").notNull(),
},
(table) => {
	return {
		id: unique("id").on(table.id),
	}
});

export const modx_diaeuro2014 = mysqlTable("modx_diaeuro2014", {
	id: int("id").autoincrement().notNull(),
	count: int("count").notNull(),
});

export const modx_diaeuro2014_player = mysqlTable("modx_diaeuro2014_player", {
	uid: int("uid").notNull(),
	player: varchar("player", { length: 100 }).notNull(),
},
(table) => {
	return {
		uid: index("uid").on(table.uid),
	}
});

export const modx_diaeuro2014_toto = mysqlTable("modx_diaeuro2014_toto", {
	uid: int("uid").notNull(),
	date: int("date").notNull(),
	time: int("time").notNull(),
	tipp: char("tipp", { length: 1 }).notNull(),
},
(table) => {
	return {
		uid: index("uid").on(table.uid),
	}
});

export const modx_diaeuro2015 = mysqlTable("modx_diaeuro2015", {
	id: int("id").autoincrement().notNull(),
	count: int("count").notNull(),
});

export const modx_diaeuro2015_player = mysqlTable("modx_diaeuro2015_player", {
	uid: int("uid").notNull(),
	player: varchar("player", { length: 100 }).notNull(),
},
(table) => {
	return {
		uid: index("uid").on(table.uid),
	}
});

export const modx_diaeuro2015_toto = mysqlTable("modx_diaeuro2015_toto", {
	uid: int("uid").notNull(),
	date: int("date").notNull(),
	time: int("time").notNull(),
	tipp: char("tipp", { length: 1 }).notNull(),
},
(table) => {
	return {
		uid: index("uid").on(table.uid),
	}
});

export const modx_diaeuro2016_toto = mysqlTable("modx_diaeuro2016_toto", {
	uid: int("uid").notNull(),
	date: int("date").notNull(),
	time: int("time").notNull(),
	tipp: char("tipp", { length: 1 }).notNull(),
},
(table) => {
	return {
		uid: index("uid").on(table.uid),
	}
});

export const modx_diaeuro2017_toto = mysqlTable("modx_diaeuro2017_toto", {
	uid: int("uid").notNull(),
	date: int("date").notNull(),
	time: int("time").notNull(),
	tipp: char("tipp", { length: 1 }).notNull(),
},
(table) => {
	return {
		uid: index("uid").on(table.uid),
	}
});

export const modx_diaeuro2018_toto = mysqlTable("modx_diaeuro2018_toto", {
	uid: varchar("uid", { length: 100 }).notNull(),
	date: int("date").notNull(),
	time: int("time").notNull(),
	tipp: char("tipp", { length: 1 }).notNull(),
},
(table) => {
	return {
		uid: index("uid").on(table.uid),
	}
});

export const modx_documentgroup_names = mysqlTable("modx_documentgroup_names", {
	id: int("id").autoincrement().notNull(),
	name: varchar("name", { length: 245 }).default('').notNull(),
	private_memgroup: tinyint("private_memgroup").default(0),
	private_webgroup: tinyint("private_webgroup").default(0),
},
(table) => {
	return {
		name: unique("name").on(table.name),
	}
});

export const modx_document_groups = mysqlTable("modx_document_groups", {
	id: int("id").autoincrement().notNull(),
	document_group: int("document_group").default(0).notNull(),
	document: int("document").default(0).notNull(),
},
(table) => {
	return {
		document: index("document").on(table.document),
		document_group: index("document_group").on(table.document_group),
		ix_dg_id: unique("ix_dg_id").on(table.document_group, table.document),
	}
});

export const modx_event_log = mysqlTable("modx_event_log", {
	id: int("id").autoincrement().notNull(),
	eventid: int("eventid").default(0),
	createdon: int("createdon").default(0).notNull(),
	type: tinyint("type").default(1).notNull(),
	user: int("user").default(0).notNull(),
	usertype: tinyint("usertype").default(0).notNull(),
	source: varchar("source", { length: 50 }).default('').notNull(),
	description: text("description"),
},
(table) => {
	return {
		user: index("user").on(table.user),
	}
});

export const modx_fd_count = mysqlTable("modx_fd_count", {
	id: int("id").autoincrement().notNull(),
	filename: text("filename"),
	count: int("count").default(0),
});

export const modx_geokviz2014 = mysqlTable("modx_geokviz2014", {
	id: int("id").autoincrement().notNull(),
	date: timestamp("date", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull(),
	jatek: text("jatek").notNull(),
	ok: int("ok").notNull(),
});

export const modx_jegkrem2012 = mysqlTable("modx_jegkrem2012", {
	date: timestamp("date", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	id: int("id").notNull(),
	user: varchar("user", { length: 255 }).notNull(),
	jatek: text("jatek").notNull(),
	ok: int("ok").notNull(),
},
(table) => {
	return {
		id: unique("id").on(table.id),
	}
});

export const modx_jot_content = mysqlTable("modx_jot_content", {
	id: int("id").autoincrement().notNull(),
	title: varchar("title", { length: 255 }),
	tagid: varchar("tagid", { length: 50 }),
	published: int("published").default(0).notNull(),
	uparent: int("uparent").default(0).notNull(),
	parent: int("parent").default(0).notNull(),
	flags: varchar("flags", { length: 25 }),
	secip: varchar("secip", { length: 32 }),
	sechash: varchar("sechash", { length: 32 }),
	content: mediumtext("content"),
	customfields: mediumtext("customfields"),
	mode: int("mode").default(1).notNull(),
	createdby: int("createdby").default(0).notNull(),
	createdon: int("createdon").default(0).notNull(),
	editedby: int("editedby").default(0).notNull(),
	editedon: int("editedon").default(0).notNull(),
	deleted: int("deleted").default(0).notNull(),
	deletedon: int("deletedon").default(0).notNull(),
	deletedby: int("deletedby").default(0).notNull(),
	publishedon: int("publishedon").default(0).notNull(),
	publishedby: int("publishedby").default(0).notNull(),
},
(table) => {
	return {
		parent: index("parent").on(table.parent),
		secip: index("secip").on(table.secip),
		tagidx: index("tagidx").on(table.tagid),
		uparent: index("uparent").on(table.uparent),
	}
});

export const modx_jot_fields = mysqlTable("modx_jot_fields", {
	id: mediumint("id").notNull(),
	label: varchar("label", { length: 50 }).notNull(),
	content: text("content"),
},
(table) => {
	return {
		id: index("id").on(table.id),
		label: index("label").on(table.label),
	}
});

export const modx_jot_subscriptions = mysqlTable("modx_jot_subscriptions", {
	id: mediumint("id").autoincrement().notNull(),
	uparent: mediumint("uparent").notNull(),
	tagid: varchar("tagid", { length: 50 }).default('').notNull(),
	userid: mediumint("userid").notNull(),
},
(table) => {
	return {
		uparent: index("uparent").on(table.uparent),
		tagid: index("tagid").on(table.tagid),
		userid: index("userid").on(table.userid),
	}
});

export const modx_keyword_xref = mysqlTable("modx_keyword_xref", {
	content_id: int("content_id").default(0).notNull(),
	keyword_id: int("keyword_id").default(0).notNull(),
},
(table) => {
	return {
		content_id: index("content_id").on(table.content_id),
		keyword_id: index("keyword_id").on(table.keyword_id),
	}
});

export const modx_manager_log = mysqlTable("modx_manager_log", {
	id: int("id").autoincrement().notNull(),
	timestamp: int("timestamp").default(0).notNull(),
	internalKey: int("internalKey").default(0).notNull(),
	username: varchar("username", { length: 255 }),
	action: int("action").default(0).notNull(),
	itemid: varchar("itemid", { length: 10 }),
	itemname: varchar("itemname", { length: 255 }),
	message: varchar("message", { length: 255 }).default('').notNull(),
	ip: varchar("ip", { length: 46 }),
	useragent: varchar("useragent", { length: 255 }),
});

export const modx_manager_users = mysqlTable("modx_manager_users", {
	id: int("id").autoincrement().notNull(),
	username: varchar("username", { length: 100 }).default('').notNull(),
	password: varchar("password", { length: 100 }).default('').notNull(),
},
(table) => {
	return {
		username: unique("username").on(table.username),
	}
});

export const modx_membergroup_access = mysqlTable("modx_membergroup_access", {
	id: int("id").autoincrement().notNull(),
	membergroup: int("membergroup").default(0).notNull(),
	documentgroup: int("documentgroup").default(0).notNull(),
});

export const modx_membergroup_names = mysqlTable("modx_membergroup_names", {
	id: int("id").autoincrement().notNull(),
	name: varchar("name", { length: 245 }).default('').notNull(),
},
(table) => {
	return {
		name: unique("name").on(table.name),
	}
});

export const modx_member_groups = mysqlTable("modx_member_groups", {
	id: int("id").autoincrement().notNull(),
	user_group: int("user_group").default(0).notNull(),
	member: int("member").default(0).notNull(),
},
(table) => {
	return {
		ix_group_member: unique("ix_group_member").on(table.user_group, table.member),
	}
});

export const modx_page_hit_counter = mysqlTable("modx_page_hit_counter", {
	page_id: int("page_id").default(0).notNull(),
	page_count: int("page_count").default(0).notNull(),
},
(table) => {
	return {
		page_id: unique("page_id").on(table.page_id),
	}
});

export const modx_recepted = mysqlTable("modx_recepted", {
	internalKey: int("internalKey").notNull(),
	user: varchar("user", { length: 255 }).notNull(),
	nev: varchar("nev", { length: 255 }).notNull(),
	cv: text("cv").notNull(),
	foto: varchar("foto", { length: 255 }).notNull(),
	etel1: varchar("etel1", { length: 255 }).notNull(),
	hozzavalok1: text("hozzavalok1").notNull(),
	elkeszites1: text("elkeszites1").notNull(),
	adag1: varchar("adag1", { length: 255 }).notNull(),
	foto1_1: varchar("foto1_1", { length: 255 }).notNull(),
	foto1_2: varchar("foto1_2", { length: 255 }).notNull(),
	foto1_3: varchar("foto1_3", { length: 255 }).notNull(),
	etel2: varchar("etel2", { length: 255 }).notNull(),
	hozzavalok2: text("hozzavalok2").notNull(),
	elkeszites2: text("elkeszites2").notNull(),
	adag2: varchar("adag2", { length: 255 }).notNull(),
	foto2_1: varchar("foto2_1", { length: 255 }).notNull(),
	foto2_2: varchar("foto2_2", { length: 255 }).notNull(),
	foto2_3: varchar("foto2_3", { length: 255 }).notNull(),
	etel3: varchar("etel3", { length: 255 }).notNull(),
	hozzavalok3: text("hozzavalok3").notNull(),
	elkeszites3: text("elkeszites3").notNull(),
	adag3: varchar("adag3", { length: 255 }).notNull(),
	foto3_1: varchar("foto3_1", { length: 255 }).notNull(),
	foto3_2: varchar("foto3_2", { length: 255 }).notNull(),
	foto3_3: varchar("foto3_3", { length: 255 }).notNull(),
},
(table) => {
	return {
		userid: index("userid").on(table.internalKey),
	}
});

export const modx_receptek2015 = mysqlTable("modx_receptek2015", {
	internalKey: int("internalKey").autoincrement().notNull(),
	user: varchar("user", { length: 255 }).notNull(),
	nev: varchar("nev", { length: 255 }).notNull(),
	etel1: varchar("etel1", { length: 255 }).notNull(),
	hozzavalok1: text("hozzavalok1").notNull(),
	elkeszites1: text("elkeszites1").notNull(),
	adag1: varchar("adag1", { length: 255 }).notNull(),
	foto1_1: varchar("foto1_1", { length: 255 }).notNull(),
	foto1_2: varchar("foto1_2", { length: 255 }).notNull(),
	foto1_3: varchar("foto1_3", { length: 255 }).notNull(),
	etel2: varchar("etel2", { length: 255 }).notNull(),
	hozzavalok2: text("hozzavalok2").notNull(),
	elkeszites2: text("elkeszites2").notNull(),
	adag2: varchar("adag2", { length: 255 }).notNull(),
	foto2_1: varchar("foto2_1", { length: 255 }).notNull(),
	foto2_2: varchar("foto2_2", { length: 255 }).notNull(),
	foto2_3: varchar("foto2_3", { length: 255 }).notNull(),
	etel3: varchar("etel3", { length: 255 }).notNull(),
	hozzavalok3: text("hozzavalok3").notNull(),
	elkeszites3: text("elkeszites3").notNull(),
	adag3: varchar("adag3", { length: 255 }).notNull(),
	foto3_1: varchar("foto3_1", { length: 255 }).notNull(),
	foto3_2: varchar("foto3_2", { length: 255 }).notNull(),
	foto3_3: varchar("foto3_3", { length: 255 }).notNull(),
},
(table) => {
	return {
		internalKey: unique("internalKey").on(table.internalKey),
	}
});

export const modx_receptek2016 = mysqlTable("modx_receptek2016", {
	internalKey: int("internalKey").autoincrement().notNull(),
	user: varchar("user", { length: 255 }).notNull(),
	nev: varchar("nev", { length: 255 }).notNull(),
	kitolto: varchar("kitolto", { length: 255 }).notNull(),
	klub: varchar("klub", { length: 255 }).notNull(),
	etel1: varchar("etel1", { length: 255 }).notNull(),
	hozzavalok1: text("hozzavalok1").notNull(),
	elkeszites1: text("elkeszites1").notNull(),
	adag1: varchar("adag1", { length: 255 }).notNull(),
	foto1_1: varchar("foto1_1", { length: 255 }).notNull(),
	foto1_2: varchar("foto1_2", { length: 255 }).notNull(),
	foto1_3: varchar("foto1_3", { length: 255 }).notNull(),
	etel2: varchar("etel2", { length: 255 }).notNull(),
	hozzavalok2: text("hozzavalok2").notNull(),
	elkeszites2: text("elkeszites2").notNull(),
	adag2: varchar("adag2", { length: 255 }).notNull(),
	foto2_1: varchar("foto2_1", { length: 255 }).notNull(),
	foto2_2: varchar("foto2_2", { length: 255 }).notNull(),
	foto2_3: varchar("foto2_3", { length: 255 }).notNull(),
	etel3: varchar("etel3", { length: 255 }).notNull(),
	hozzavalok3: text("hozzavalok3").notNull(),
	elkeszites3: text("elkeszites3").notNull(),
	adag3: varchar("adag3", { length: 255 }).notNull(),
	foto3_1: varchar("foto3_1", { length: 255 }).notNull(),
	foto3_2: varchar("foto3_2", { length: 255 }).notNull(),
	foto3_3: varchar("foto3_3", { length: 255 }).notNull(),
},
(table) => {
	return {
		internalKey: unique("internalKey").on(table.internalKey),
	}
});

export const modx_receptek2017 = mysqlTable("modx_receptek2017", {
	internalKey: int("internalKey").autoincrement().notNull(),
	user: varchar("user", { length: 255 }).notNull(),
	nev: varchar("nev", { length: 255 }).notNull(),
	kitolto: varchar("kitolto", { length: 255 }).notNull(),
	klub: varchar("klub", { length: 255 }).notNull(),
	etel1: varchar("etel1", { length: 255 }).notNull(),
	hozzavalok1: text("hozzavalok1").notNull(),
	elkeszites1: text("elkeszites1").notNull(),
	adag1: varchar("adag1", { length: 255 }).notNull(),
	foto1_1: varchar("foto1_1", { length: 255 }).notNull(),
	foto1_2: varchar("foto1_2", { length: 255 }).notNull(),
	foto1_3: varchar("foto1_3", { length: 255 }).notNull(),
	etel2: varchar("etel2", { length: 255 }).notNull(),
	hozzavalok2: text("hozzavalok2").notNull(),
	elkeszites2: text("elkeszites2").notNull(),
	adag2: varchar("adag2", { length: 255 }).notNull(),
	foto2_1: varchar("foto2_1", { length: 255 }).notNull(),
	foto2_2: varchar("foto2_2", { length: 255 }).notNull(),
	foto2_3: varchar("foto2_3", { length: 255 }).notNull(),
	etel3: varchar("etel3", { length: 255 }).notNull(),
	hozzavalok3: text("hozzavalok3").notNull(),
	elkeszites3: text("elkeszites3").notNull(),
	adag3: varchar("adag3", { length: 255 }).notNull(),
	foto3_1: varchar("foto3_1", { length: 255 }).notNull(),
	foto3_2: varchar("foto3_2", { length: 255 }).notNull(),
	foto3_3: varchar("foto3_3", { length: 255 }).notNull(),
},
(table) => {
	return {
		internalKey: unique("internalKey").on(table.internalKey),
	}
});

export const modx_receptek2018 = mysqlTable("modx_receptek2018", {
	internalKey: int("internalKey").autoincrement().notNull(),
	user: varchar("user", { length: 255 }).notNull(),
	nev: varchar("nev", { length: 255 }).notNull(),
	kitolto: varchar("kitolto", { length: 255 }).notNull(),
	klub: varchar("klub", { length: 255 }).notNull(),
	etel1: varchar("etel1", { length: 255 }).notNull(),
	hozzavalok1: text("hozzavalok1").notNull(),
	elkeszites1: text("elkeszites1").notNull(),
	adag1: varchar("adag1", { length: 255 }).notNull(),
	foto1_1: varchar("foto1_1", { length: 255 }).notNull(),
	foto1_2: varchar("foto1_2", { length: 255 }).notNull(),
	foto1_3: varchar("foto1_3", { length: 255 }).notNull(),
	etel2: varchar("etel2", { length: 255 }).notNull(),
	hozzavalok2: text("hozzavalok2").notNull(),
	elkeszites2: text("elkeszites2").notNull(),
	adag2: varchar("adag2", { length: 255 }).notNull(),
	foto2_1: varchar("foto2_1", { length: 255 }).notNull(),
	foto2_2: varchar("foto2_2", { length: 255 }).notNull(),
	foto2_3: varchar("foto2_3", { length: 255 }).notNull(),
	etel3: varchar("etel3", { length: 255 }).notNull(),
	hozzavalok3: text("hozzavalok3").notNull(),
	elkeszites3: text("elkeszites3").notNull(),
	adag3: varchar("adag3", { length: 255 }).notNull(),
	foto3_1: varchar("foto3_1", { length: 255 }).notNull(),
	foto3_2: varchar("foto3_2", { length: 255 }).notNull(),
	foto3_3: varchar("foto3_3", { length: 255 }).notNull(),
},
(table) => {
	return {
		internalKey: unique("internalKey").on(table.internalKey),
	}
});

export const modx_receptem = mysqlTable("modx_receptem", {
	id: int("id").autoincrement().notNull(),
	user: varchar("user", { length: 255 }).notNull(),
	etel: varchar("etel", { length: 255 }).notNull(),
	hozzavalok: text("hozzavalok").notNull(),
	elkeszites: text("elkeszites").notNull(),
	adag: varchar("adag", { length: 255 }).notNull(),
	foto1: varchar("foto1", { length: 255 }).notNull(),
	foto2: varchar("foto2", { length: 255 }).notNull(),
	foto3: varchar("foto3", { length: 255 }).notNull(),
});

export const modx_referers_counter = mysqlTable("modx_referers_counter", {
	ref_url: varchar("ref_url", { length: 255 }),
	ref_count: int("ref_count").default(0).notNull(),
},
(table) => {
	return {
		ref_url: unique("ref_url").on(table.ref_url),
	}
});

export const modx_site_content = mysqlTable("modx_site_content", {
	id: int("id").autoincrement().notNull(),
	type: varchar("type", { length: 20 }).default('document').notNull(),
	contentType: varchar("contentType", { length: 50 }).default('text/html').notNull(),
	pagetitle: varchar("pagetitle", { length: 255 }).default('').notNull(),
	longtitle: varchar("longtitle", { length: 255 }).default('').notNull(),
	description: varchar("description", { length: 255 }).default('').notNull(),
	alias: varchar("alias", { length: 245 }).default(''),
	link_attributes: varchar("link_attributes", { length: 255 }).default('').notNull(),
	published: int("published").default(0).notNull(),
	pub_date: int("pub_date").default(0).notNull(),
	unpub_date: int("unpub_date").default(0).notNull(),
	parent: int("parent").default(0).notNull(),
	isfolder: int("isfolder").default(0).notNull(),
	introtext: text("introtext"),
	content: mediumtext("content"),
	richtext: tinyint("richtext").default(1).notNull(),
	template: int("template").default(0).notNull(),
	menuindex: int("menuindex").default(0).notNull(),
	searchable: int("searchable").default(1).notNull(),
	cacheable: int("cacheable").default(1).notNull(),
	createdby: int("createdby").default(0).notNull(),
	createdon: int("createdon").default(0).notNull(),
	editedby: int("editedby").default(0).notNull(),
	editedon: int("editedon").default(0).notNull(),
	deleted: int("deleted").default(0).notNull(),
	deletedon: int("deletedon").default(0).notNull(),
	deletedby: int("deletedby").default(0).notNull(),
	publishedon: int("publishedon").default(0).notNull(),
	publishedby: int("publishedby").default(0).notNull(),
	menutitle: varchar("menutitle", { length: 255 }).default('').notNull(),
	donthit: tinyint("donthit").default(0).notNull(),
	haskeywords: tinyint("haskeywords").default(0).notNull(),
	hasmetatags: tinyint("hasmetatags").default(0).notNull(),
	privateweb: tinyint("privateweb").default(0).notNull(),
	privatemgr: tinyint("privatemgr").default(0).notNull(),
	content_dispo: tinyint("content_dispo").default(0).notNull(),
	hidemenu: tinyint("hidemenu").default(0).notNull(),
	alias_visible: int("alias_visible").default(1).notNull(),
},
(table) => {
	return {
		id: index("id").on(table.id),
		parent: index("parent").on(table.parent),
		aliasidx: index("aliasidx").on(table.alias),
		typeidx: index("typeidx").on(table.type),
		content_ft_idx: index("content_ft_idx").on(table.pagetitle, table.description, table.content),
	}
});

export const modx_site_content_metatags = mysqlTable("modx_site_content_metatags", {
	content_id: int("content_id").default(0).notNull(),
	metatag_id: int("metatag_id").default(0).notNull(),
},
(table) => {
	return {
		content_id: index("content_id").on(table.content_id),
		metatag_id: index("metatag_id").on(table.metatag_id),
	}
});

export const modx_site_htmlsnippets = mysqlTable("modx_site_htmlsnippets", {
	id: int("id").autoincrement().notNull(),
	name: varchar("name", { length: 50 }).default('').notNull(),
	description: varchar("description", { length: 255 }).default('Chunk').notNull(),
	editor_type: int("editor_type").default(0).notNull(),
	editor_name: varchar("editor_name", { length: 50 }).default('none').notNull(),
	category: int("category").default(0).notNull(),
	cache_type: tinyint("cache_type").default(0).notNull(),
	snippet: mediumtext("snippet"),
	locked: tinyint("locked").default(0).notNull(),
	createdon: int("createdon").default(0).notNull(),
	editedon: int("editedon").default(0).notNull(),
	disabled: tinyint("disabled").default(0).notNull(),
});

export const modx_site_keywords = mysqlTable("modx_site_keywords", {
	id: int("id").autoincrement().notNull(),
	keyword: varchar("keyword", { length: 40 }).default('').notNull(),
},
(table) => {
	return {
		keyword: unique("keyword").on(table.keyword),
	}
});

export const modx_site_metatags = mysqlTable("modx_site_metatags", {
	id: int("id").autoincrement().notNull(),
	name: varchar("name", { length: 50 }).default('').notNull(),
	tag: varchar("tag", { length: 50 }).default('').notNull(),
	tagvalue: varchar("tagvalue", { length: 255 }).default('').notNull(),
	http_equiv: tinyint("http_equiv").default(0).notNull(),
});

export const modx_site_modules = mysqlTable("modx_site_modules", {
	id: int("id").autoincrement().notNull(),
	name: varchar("name", { length: 50 }).default('').notNull(),
	description: varchar("description", { length: 255 }).notNull(),
	editor_type: int("editor_type").default(0).notNull(),
	disabled: tinyint("disabled").default(0).notNull(),
	category: int("category").default(0).notNull(),
	wrap: tinyint("wrap").default(0).notNull(),
	locked: tinyint("locked").default(0).notNull(),
	icon: varchar("icon", { length: 255 }).default('').notNull(),
	enable_resource: tinyint("enable_resource").default(0).notNull(),
	resourcefile: varchar("resourcefile", { length: 255 }).default('').notNull(),
	createdon: int("createdon").default(0).notNull(),
	editedon: int("editedon").default(0).notNull(),
	guid: varchar("guid", { length: 32 }).default('').notNull(),
	enable_sharedparams: tinyint("enable_sharedparams").default(0).notNull(),
	properties: text("properties"),
	modulecode: mediumtext("modulecode"),
});

export const modx_site_module_access = mysqlTable("modx_site_module_access", {
	id: int("id").autoincrement().notNull(),
	module: int("module").default(0).notNull(),
	usergroup: int("usergroup").default(0).notNull(),
});

export const modx_site_module_depobj = mysqlTable("modx_site_module_depobj", {
	id: int("id").autoincrement().notNull(),
	module: int("module").default(0).notNull(),
	resource: int("resource").default(0).notNull(),
	type: int("type").default(0).notNull(),
});

export const modx_site_plugins = mysqlTable("modx_site_plugins", {
	id: int("id").autoincrement().notNull(),
	name: varchar("name", { length: 50 }).default('').notNull(),
	description: varchar("description", { length: 255 }).default('Plugin').notNull(),
	editor_type: int("editor_type").default(0).notNull(),
	category: int("category").default(0).notNull(),
	cache_type: tinyint("cache_type").default(0).notNull(),
	plugincode: mediumtext("plugincode"),
	locked: tinyint("locked").default(0).notNull(),
	properties: text("properties"),
	disabled: tinyint("disabled").default(0).notNull(),
	moduleguid: varchar("moduleguid", { length: 32 }).default('').notNull(),
	createdon: int("createdon").default(0).notNull(),
	editedon: int("editedon").default(0).notNull(),
});

export const modx_site_plugin_events = mysqlTable("modx_site_plugin_events", {
	pluginid: int("pluginid").notNull(),
	evtid: int("evtid").default(0).notNull(),
	priority: int("priority").default(0).notNull(),
});

export const modx_site_snippets = mysqlTable("modx_site_snippets", {
	id: int("id").autoincrement().notNull(),
	name: varchar("name", { length: 50 }).default('').notNull(),
	description: varchar("description", { length: 255 }).default('Snippet').notNull(),
	editor_type: int("editor_type").default(0).notNull(),
	category: int("category").default(0).notNull(),
	cache_type: tinyint("cache_type").default(0).notNull(),
	snippet: mediumtext("snippet"),
	locked: tinyint("locked").default(0).notNull(),
	properties: text("properties"),
	moduleguid: varchar("moduleguid", { length: 32 }).default('').notNull(),
	createdon: int("createdon").default(0).notNull(),
	editedon: int("editedon").default(0).notNull(),
	disabled: tinyint("disabled").default(0).notNull(),
});

export const modx_site_templates = mysqlTable("modx_site_templates", {
	id: int("id").autoincrement().notNull(),
	templatename: varchar("templatename", { length: 50 }).default('').notNull(),
	templatealias: varchar("templatealias", { length: 255 }),
	description: varchar("description", { length: 255 }).default('Template').notNull(),
	editor_type: int("editor_type").default(0).notNull(),
	category: int("category").default(0).notNull(),
	icon: varchar("icon", { length: 255 }).default('').notNull(),
	template_type: int("template_type").default(0).notNull(),
	content: mediumtext("content"),
	locked: tinyint("locked").default(0).notNull(),
	selectable: tinyint("selectable").default(1).notNull(),
	editedon: int("editedon").default(0).notNull(),
	createdon: int("createdon").default(0).notNull(),
});

export const modx_site_tmplvars = mysqlTable("modx_site_tmplvars", {
	id: int("id").autoincrement().notNull(),
	type: varchar("type", { length: 50 }).default('').notNull(),
	name: varchar("name", { length: 50 }).default('').notNull(),
	caption: varchar("caption", { length: 80 }).default('').notNull(),
	description: varchar("description", { length: 255 }).default('').notNull(),
	editor_type: int("editor_type").default(0).notNull(),
	category: int("category").default(0).notNull(),
	locked: tinyint("locked").default(0).notNull(),
	elements: text("elements"),
	rank: int("rank").default(0).notNull(),
	display: varchar("display", { length: 20 }).default('').notNull(),
	display_params: text("display_params"),
	default_text: text("default_text"),
	editedon: int("editedon").default(0).notNull(),
	createdon: int("createdon").default(0).notNull(),
},
(table) => {
	return {
		indx_rank: index("indx_rank").on(table.rank),
	}
});

export const modx_site_tmplvar_access = mysqlTable("modx_site_tmplvar_access", {
	id: int("id").autoincrement().notNull(),
	tmplvarid: int("tmplvarid").default(0).notNull(),
	documentgroup: int("documentgroup").default(0).notNull(),
});

export const modx_site_tmplvar_contentvalues = mysqlTable("modx_site_tmplvar_contentvalues", {
	id: int("id").autoincrement().notNull(),
	tmplvarid: int("tmplvarid").default(0).notNull(),
	contentid: int("contentid").default(0).notNull(),
	value: mediumtext("value"),
},
(table) => {
	return {
		idx_tmplvarid: index("idx_tmplvarid").on(table.tmplvarid),
		idx_id: index("idx_id").on(table.contentid),
		value_ft_idx: index("value_ft_idx").on(table.value),
		ix_tvid_contentid: unique("ix_tvid_contentid").on(table.tmplvarid, table.contentid),
	}
});

export const modx_site_tmplvar_templates = mysqlTable("modx_site_tmplvar_templates", {
	tmplvarid: int("tmplvarid").default(0).notNull(),
	templateid: int("templateid").default(0).notNull(),
	rank: int("rank").default(0).notNull(),
});

export const modx_system_eventnames = mysqlTable("modx_system_eventnames", {
	id: int("id").autoincrement().notNull(),
	name: varchar("name", { length: 50 }).default('').notNull(),
	service: tinyint("service").default(0).notNull(),
	groupname: varchar("groupname", { length: 20 }).default('').notNull(),
},
(table) => {
	return {
		name: unique("name").on(table.name),
	}
});

export const modx_system_settings = mysqlTable("modx_system_settings", {
	setting_name: varchar("setting_name", { length: 50 }).default('').notNull(),
	setting_value: text("setting_value"),
});

export const modx_txnewsletters_usersdata = mysqlTable("modx_txnewsletters_usersdata", {
	Company: varchar("Company", { length: 255 }).default('').notNull(),
	Name: varchar("Name", { length: 255 }).default('').notNull(),
	Phone: varchar("Phone", { length: 255 }).default('').notNull(),
	Email: varchar("Email", { length: 255 }).default('').notNull(),
	Zipcode: varchar("Zipcode", { length: 20 }).default('').notNull(),
	City: varchar("City", { length: 255 }).default('').notNull(),
	Address: varchar("Address", { length: 255 }).default('').notNull(),
	Site: varchar("Site", { length: 255 }).default('').notNull(),
	Partner: varchar("Partner", { length: 64 }).default('').notNull(),
	Timestamp: varchar("Timestamp", { length: 255 }).default('').notNull(),
});

export const modx_user_attributes = mysqlTable("modx_user_attributes", {
	id: int("id").autoincrement().notNull(),
	internalKey: int("internalKey").default(0).notNull(),
	fullname: varchar("fullname", { length: 100 }).default('').notNull(),
	role: int("role").default(0).notNull(),
	email: varchar("email", { length: 100 }).default('').notNull(),
	phone: varchar("phone", { length: 100 }).default('').notNull(),
	mobilephone: varchar("mobilephone", { length: 100 }).default('').notNull(),
	blocked: int("blocked").default(0).notNull(),
	blockeduntil: int("blockeduntil").default(0).notNull(),
	blockedafter: int("blockedafter").default(0).notNull(),
	logincount: int("logincount").default(0).notNull(),
	lastlogin: int("lastlogin").default(0).notNull(),
	thislogin: int("thislogin").default(0).notNull(),
	failedlogincount: int("failedlogincount").default(0).notNull(),
	sessionid: varchar("sessionid", { length: 100 }).default('').notNull(),
	dob: int("dob").default(0).notNull(),
	gender: int("gender").default(0).notNull(),
	country: varchar("country", { length: 5 }).default('').notNull(),
	street: varchar("street", { length: 255 }).default('').notNull(),
	city: varchar("city", { length: 255 }).default('').notNull(),
	state: varchar("state", { length: 25 }).default('').notNull(),
	zip: varchar("zip", { length: 25 }).default('').notNull(),
	fax: varchar("fax", { length: 100 }).default('').notNull(),
	photo: varchar("photo", { length: 255 }).default('').notNull(),
	comment: text("comment"),
	editedon: int("editedon").default(0).notNull(),
	createdon: int("createdon").default(0).notNull(),
	verified: int("verified").default(1).notNull(),
},
(table) => {
	return {
		userid: index("userid").on(table.internalKey),
	}
});

export const modx_user_messages = mysqlTable("modx_user_messages", {
	id: int("id").autoincrement().notNull(),
	type: varchar("type", { length: 15 }).default('').notNull(),
	subject: varchar("subject", { length: 60 }).default('').notNull(),
	message: text("message"),
	sender: int("sender").default(0).notNull(),
	recipient: int("recipient").default(0).notNull(),
	private: tinyint("private").default(0).notNull(),
	postdate: int("postdate").default(0).notNull(),
	messageread: tinyint("messageread").default(0).notNull(),
});

export const modx_user_roles = mysqlTable("modx_user_roles", {
	id: int("id").autoincrement().notNull(),
	name: varchar("name", { length: 50 }).default('').notNull(),
	description: varchar("description", { length: 255 }).default('').notNull(),
	frames: int("frames").default(0).notNull(),
	home: int("home").default(0).notNull(),
	view_document: int("view_document").default(0).notNull(),
	new_document: int("new_document").default(0).notNull(),
	save_document: int("save_document").default(0).notNull(),
	publish_document: int("publish_document").default(0).notNull(),
	delete_document: int("delete_document").default(0).notNull(),
	empty_trash: int("empty_trash").default(0).notNull(),
	action_ok: int("action_ok").default(0).notNull(),
	logout: int("logout").default(0).notNull(),
	help: int("help").default(0).notNull(),
	messages: int("messages").default(0).notNull(),
	new_user: int("new_user").default(0).notNull(),
	edit_user: int("edit_user").default(0).notNull(),
	logs: int("logs").default(0).notNull(),
	edit_parser: int("edit_parser").default(0).notNull(),
	save_parser: int("save_parser").default(0).notNull(),
	edit_template: int("edit_template").default(0).notNull(),
	settings: int("settings").default(0).notNull(),
	credits: int("credits").default(0).notNull(),
	new_template: int("new_template").default(0).notNull(),
	save_template: int("save_template").default(0).notNull(),
	delete_template: int("delete_template").default(0).notNull(),
	edit_snippet: int("edit_snippet").default(0).notNull(),
	new_snippet: int("new_snippet").default(0).notNull(),
	save_snippet: int("save_snippet").default(0).notNull(),
	delete_snippet: int("delete_snippet").default(0).notNull(),
	edit_chunk: int("edit_chunk").default(0).notNull(),
	new_chunk: int("new_chunk").default(0).notNull(),
	save_chunk: int("save_chunk").default(0).notNull(),
	delete_chunk: int("delete_chunk").default(0).notNull(),
	empty_cache: int("empty_cache").default(0).notNull(),
	edit_document: int("edit_document").default(0).notNull(),
	change_password: int("change_password").default(0).notNull(),
	error_dialog: int("error_dialog").default(0).notNull(),
	about: int("about").default(0).notNull(),
	category_manager: int("category_manager").default(0).notNull(),
	file_manager: int("file_manager").default(0).notNull(),
	assets_images: int("assets_images").default(1).notNull(),
	assets_files: int("assets_files").default(1).notNull(),
	save_user: int("save_user").default(0).notNull(),
	delete_user: int("delete_user").default(0).notNull(),
	save_password: int("save_password").default(0).notNull(),
	edit_role: int("edit_role").default(0).notNull(),
	save_role: int("save_role").default(0).notNull(),
	delete_role: int("delete_role").default(0).notNull(),
	new_role: int("new_role").default(0).notNull(),
	access_permissions: int("access_permissions").default(0).notNull(),
	bk_manager: int("bk_manager").default(0).notNull(),
	new_plugin: int("new_plugin").default(0).notNull(),
	edit_plugin: int("edit_plugin").default(0).notNull(),
	save_plugin: int("save_plugin").default(0).notNull(),
	delete_plugin: int("delete_plugin").default(0).notNull(),
	new_module: int("new_module").default(0).notNull(),
	edit_module: int("edit_module").default(0).notNull(),
	save_module: int("save_module").default(0).notNull(),
	delete_module: int("delete_module").default(0).notNull(),
	exec_module: int("exec_module").default(0).notNull(),
	view_eventlog: int("view_eventlog").default(0).notNull(),
	delete_eventlog: int("delete_eventlog").default(0).notNull(),
	manage_metatags: int("manage_metatags").default(0).notNull(),
	edit_doc_metatags: int("edit_doc_metatags").default(0).notNull(),
	new_web_user: int("new_web_user").default(0).notNull(),
	edit_web_user: int("edit_web_user").default(0).notNull(),
	save_web_user: int("save_web_user").default(0).notNull(),
	delete_web_user: int("delete_web_user").default(0).notNull(),
	web_access_permissions: int("web_access_permissions").default(0).notNull(),
	view_unpublished: int("view_unpublished").default(0).notNull(),
	import_static: int("import_static").default(0).notNull(),
	export_static: int("export_static").default(0).notNull(),
	remove_locks: int("remove_locks").default(0).notNull(),
	change_resourcetype: int("change_resourcetype").default(0).notNull(),
	display_locks: int("display_locks").default(0).notNull(),
});

export const modx_user_settings = mysqlTable("modx_user_settings", {
	user: int("user").notNull(),
	setting_name: varchar("setting_name", { length: 50 }).default('').notNull(),
	setting_value: text("setting_value"),
},
(table) => {
	return {
		setting_name: index("setting_name").on(table.setting_name),
		user: index("user").on(table.user),
	}
});

export const modx_webgroup_access = mysqlTable("modx_webgroup_access", {
	id: int("id").autoincrement().notNull(),
	webgroup: int("webgroup").default(0).notNull(),
	documentgroup: int("documentgroup").default(0).notNull(),
});

export const modx_webgroup_names = mysqlTable("modx_webgroup_names", {
	id: int("id").autoincrement().notNull(),
	name: varchar("name", { length: 245 }).default('').notNull(),
},
(table) => {
	return {
		name: unique("name").on(table.name),
	}
});

export const modx_web_groups = mysqlTable("modx_web_groups", {
	id: int("id").autoincrement().notNull(),
	webgroup: int("webgroup").default(0).notNull(),
	webuser: int("webuser").default(0).notNull(),
},
(table) => {
	return {
		ix_group_user: unique("ix_group_user").on(table.webgroup, table.webuser),
	}
});

export const modx_web_users = mysqlTable("modx_web_users", {
	id: int("id").autoincrement().notNull(),
	username: varchar("username", { length: 100 }).default('').notNull(),
	password: varchar("password", { length: 100 }).default('').notNull(),
	cachepwd: varchar("cachepwd", { length: 100 }).default('').notNull(),
},
(table) => {
	return {
		username: unique("username").on(table.username),
	}
});

export const modx_web_user_attributes = mysqlTable("modx_web_user_attributes", {
	id: int("id").autoincrement().notNull(),
	internalKey: int("internalKey").default(0).notNull(),
	fullname: varchar("fullname", { length: 100 }).default('').notNull(),
	role: int("role").default(0).notNull(),
	email: varchar("email", { length: 100 }).default('').notNull(),
	phone: varchar("phone", { length: 100 }).default('').notNull(),
	mobilephone: varchar("mobilephone", { length: 100 }).default('').notNull(),
	blocked: int("blocked").default(0).notNull(),
	blockeduntil: int("blockeduntil").default(0).notNull(),
	blockedafter: int("blockedafter").default(0).notNull(),
	logincount: int("logincount").default(0).notNull(),
	lastlogin: int("lastlogin").default(0).notNull(),
	thislogin: int("thislogin").default(0).notNull(),
	failedlogincount: int("failedlogincount").default(0).notNull(),
	sessionid: varchar("sessionid", { length: 100 }).default('').notNull(),
	dob: int("dob").default(0).notNull(),
	gender: int("gender").default(0).notNull(),
	country: varchar("country", { length: 25 }).default('').notNull(),
	street: varchar("street", { length: 255 }).default('').notNull(),
	city: varchar("city", { length: 255 }).default('').notNull(),
	state: varchar("state", { length: 25 }).default('').notNull(),
	zip: varchar("zip", { length: 25 }).default('').notNull(),
	fax: varchar("fax", { length: 100 }).default('').notNull(),
	photo: varchar("photo", { length: 255 }).default('').notNull(),
	comment: text("comment"),
	editedon: int("editedon").default(0).notNull(),
	createdon: int("createdon").default(0).notNull(),
	verified: int("verified").default(0).notNull(),
},
(table) => {
	return {
		userid: index("userid").on(table.internalKey),
	}
});

export const modx_web_user_attributes_extended = mysqlTable("modx_web_user_attributes_extended", {
	id: int("id").autoincrement().notNull(),
	internalKey: int("internalKey").notNull(),
	diab_1: varchar("diab_1", { length: 255 }).notNull(),
	diab_2: varchar("diab_2", { length: 255 }).notNull(),
	diab_3: varchar("diab_3", { length: 255 }).notNull(),
	diab_4: varchar("diab_4", { length: 255 }).notNull(),
	diab_5: varchar("diab_5", { length: 255 }).notNull(),
	diab_6: varchar("diab_6", { length: 255 }).notNull(),
	diab_7: varchar("diab_7", { length: 255 }).notNull(),
	diab_8: varchar("diab_8", { length: 255 }).notNull(),
	diab_9: varchar("diab_9", { length: 255 }).notNull(),
	diab_0: varchar("diab_0", { length: 255 }).notNull(),
},
(table) => {
	return {
		userid: index("userid").on(table.internalKey),
	}
});

export const modx_web_user_settings = mysqlTable("modx_web_user_settings", {
	webuser: int("webuser").notNull(),
	setting_name: varchar("setting_name", { length: 50 }).default('').notNull(),
	setting_value: text("setting_value"),
},
(table) => {
	return {
		setting_name: index("setting_name").on(table.setting_name),
		webuserid: index("webuserid").on(table.webuser),
	}
});