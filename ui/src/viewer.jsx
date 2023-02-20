import { h, render } from "preact";
import { useState, useEffect } from "preact/hooks";

import * as meerkat from "./meerkat";
import { CheckSVG } from "./elements/svg";
import { CheckLine } from "./elements/line";
import { Video } from "./elements/video";
import { Clock } from "./elements/clock";
import { StaticText } from "./statics/text";
import { StaticSVG } from "./statics/svg";
import { ObjectCard } from "./elements/i2object";

function Viewer({ slug }) {
	let [dashboard, setDashboard] = useState(null);

	useEffect(() => {
		meerkat.getDashboard(slug).then((board) => setDashboard(board));
	}, [slug]);

	if (dashboard === null) {
		return;
	} else if (!dashboard.elements) {
		return;
	}

	const elements = dashboard.elements.map((element) => {
		const left = `${element.rect.x}%`;
		const top = `${element.rect.y}%`;
		const width = `${element.rect.w}%`;
		const height = `${element.rect.h}%`;
		const rotation = element.rotation
			? `rotate(${element.rotation}rad)`
			: `rotate(0rad)`;

		let ele;
		if (element.type === "clock") {
			ele = (
				<Clock
					timeZone={element.options.timeZone}
					fontSize={element.options.fontSize}
				/>
			);
		}
		if (element.type == "check-card") {
			ele = (
				<ObjectCard
					objectType={element.options.objectType}
					objectName={element.options.objectName}
					fontSize={element.options.fontSize}
				/>
			);
		}
		if (element.type === "check-svg") {
			ele = (
				<CheckSVG options={element.options} dashboard={dashboard} slug={slug} />
			);
		}
		if (element.type === "check-line") {
			ele = (
				<CheckLine
					options={element.options}
					dashboard={dashboard}
					slug={slug}
				/>
			);
		}
		if (element.type === "static-text") {
			ele = <StaticText options={element.options} />;
		}
		if (element.type === "static-svg") {
			ele = <StaticSVG options={element.options} />;
		}
		if (element.type === "image") {
			ele = <img src={element.options.image} />;
		}
		if (element.type === "video") {
			ele = <Video options={element.options} />;
		}
		if (element.type === "audio") {
			ele = <audio controls src={element.options.audioSource}></audio>;
		}

		if (element.options.linkURL) {
			ele = linkWrap(ele, element.options.linkURL);
		}

		return (
			<div
				class="check"
				style={{
					left: left,
					top: top,
					width: width,
					height: height,
					transform: rotation,
				}}
			>
				{ele}
			</div>
		);
	});

	const backgroundImage = dashboard.background ? dashboard.background : null;

	return (
		<div class="dashboard view-only">
			{backgroundImage ? (
				<img
					src={backgroundImage}
					style="height: 100%; width: 100%;"
					id="dashboard-dimensions"
				/>
			) : (
				<div style="height: 100vh; width: 100vw"></div>
			)}
			{elements}
		</div>
	);
}

function linkWrap(ele, link) {
	return <a href={link}>{ele}</a>;
}

// Paths are of the form /my-dashboard/view
const elems = window.location.pathname.split("/");
const slug = elems[elems.length - 2];
render(<Viewer slug={slug} />, document.body);
