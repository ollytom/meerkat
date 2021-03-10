import { h, Fragment, createRef } from 'preact';
import { route } from 'preact-router';
import { useState, useEffect } from 'preact/hooks';

import * as meerkat from './meerkat';

function CopyTextBox({text}) {
	const ref = createRef();

	const handleClick = e => {
		ref.current.focus();
		ref.current.select();
		document.execCommand('copy');
		//TODO notification copied!
	}

	return <div class="copy-box" onClick={handleClick}>
			<input class="form-control" ref={ref} type="text" value={text} readOnly/>
			<svg class="feather">
				<use xlinkHref={`/res/svgs/feather-sprite.svg#copy`}/>
			</svg>
		</div>
}

const titleToSlug = (title) => {
	let result = title;
	result = result.toLowerCase(); //convert upper case to lower case
	result = result.trim() //remove preceeding and trailing whitespace
	result = result.replace(/[_\s]/g, '-'); //convert spaces and underscores to dashes
	result = result.replace(/[^a-z0-9\-]/g, ''); //Remove any other characters

	return result;
}

function CreateDashboardModal({hide}) {
	const [title, setTitle] = useState('');

	const createDashboard = async e => {
		e.preventDefault();
		try {
			//TODO validate SERVER SIDE titleToSlug(title).length > 0
			const newDashboard = {
				title: title,
				tags: [],
				background: null,
				elements: [],
				globalMute: true,
				okSound: "/dashboards-data/ok.mp3",
				criticalSound: "/dashboards-data/critical.mp3",
				warningSound: "/dashboards-data/warning.mp3",
				unknownSound: "/dashboards-data/unknown.mp3",
				upSound: "/dashboards-data/up.mp3",
				downSound: "/dashboards-data/down.mp3",
			}

			const res = await meerkat.createDashboard(newDashboard);
			route(`/edit/${res.slug}`);
		} catch(e) {
			//TODO
			console.log("Failed to create modal")
			console.log(e)
		}
	}

	return <div class="modal-wrap" onMouseDown={hide}>
		<div class="modal-fixed" onMouseDown={e => e.stopPropagation()}>
			<h3>Create Dashboard</h3>

			<form onSubmit={createDashboard}>
				<label for="title">Title</label>
				<input class="form-control" id="title" name="title" type="text" placeholder="New Dashboard"
					value={title} onInput={e => setTitle(e.currentTarget.value)} />

				<label>Result url</label>
				<CopyTextBox text={window.location.host + '/view/' + titleToSlug(title)} />

				<div class="right" style="margin-top: 20px">
					<button class="rounded btn-primary btn-large" type="submit">Create</button>
				</div>
			</form>
		</div>
	</div>
}

function DashboardList({dashboards, loadDashboards, filter}) {
	const deleteDashboard = slug => meerkat.deleteDashboard(slug).then(loadDashboards);

	if(dashboards === null) {
		return <div class="subtle loading">Loading Dashboards</div>
	}

	const filteredDashboards = dashboards.filter((dashboard) => {
		if(filter === '') {
			return true;
		} else {
			return dashboard.title.toLowerCase().includes(filter.toLowerCase());
		}
	})

	if(filteredDashboards.length < 1) {
		return <div class="subtle">No dashboards found</div>
	}

	const dbs = filteredDashboards.map(dashboard => {
		const slug = titleToSlug(dashboard.title);

		return <div class="dashboard-listing">
			<h3>{dashboard.title}</h3>
			<div class="timestamps">
				<a onClick={e => route(`/view/${slug}`)}>view</a>
				<a onClick={e => route(`/edit/${slug}`)}>edit</a>
				<a onClick={e => deleteDashboard(slug)}>delete</a>
			</div>
		</div>
	});

	return <Fragment>{dbs}</Fragment>
}


function SettingsModal({hide}) {
	const [title, setTitle] = useState('');
	console.log(title);

	const changeSettings = async e => {
		try {
			await meerkat.changeSettings(title);
		} catch(e) {
			console.log("Failed to change settings:")
			console.log(e)
		}
	}

	return <div class="modal-wrap" onMouseDown={hide}>
		<div class="modal-fixed" onMouseDown={e => e.stopPropagation()}>
			<h3>Settings</h3>

			<form onSubmit={changeSettings}>
				<label for="title">App Name</label>
				<input class="form-control" id="title" name="title" type="text" placeholder="New App Name"
 					   value={title} onInput={e => setTitle(e.currentTarget.value)} />

				<div class="right" style="margin-top: 20px">
					<button class="rounded btn-primary btn-large" type="submit">Submit</button>
				</div>
			</form>
		</div>
	</div>
}

export function Home() {
	const [showModal, setShowModal] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [settings, setSettings] = useState(null);
	const [dashboards, setDashboards] = useState(null);
	const [filter, setFilter] = useState('');

	const loadDashboards = () => meerkat.getAllDashboards().then(dbs => setDashboards(dbs));
	const loadSettings = () => meerkat.getSettings().then(settings => setSettings(settings));

	useEffect(loadDashboards, []);
	useEffect(loadSettings, []);

	return <Fragment>
		<header class="telstra-color-top-border">
			<div class="home">
				<h1 class="title">{settings ? settings.appName : "Meerkat"}</h1>

				<div class="center" style="margin: 25px 0 40px;">
					<button class="rounded btn-primary btn-large" style="left: 18px !important; position: relative;" onClick={e => setShowModal(true)}>Create New Dashboard</button>
					<span onClick={e => setShowSettings(true)}><img class="settings-cog" src="../assets/settings-cogwheel.svg" alt=""/></span>
				</div>

				<div class="filter-wrap">
					<input class="form-control" type="text" id="filter" onInput={e => setFilter(e.currentTarget.value)} placeholder="Filter dashboards" />
				</div>

				<div class="filter-results">
					<DashboardList loadDashboards={loadDashboards} dashboards={dashboards} filter={filter} />
				</div>
			</div>
		</header>

	{showSettings ? <SettingsModal        hide={() => setShowSettings(false)} /> : null}
	{showModal    ? <CreateDashboardModal hide={() => setShowModal(false)}    /> : null}
	</Fragment>
}