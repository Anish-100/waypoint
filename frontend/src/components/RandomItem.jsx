import useRandomItem from "@/services/useRandomItem";

/**
 * This is a component which encapsulates a small portion of the UI.
 * The component accepts props which should be specified when the component is used
 */
function RandomItem({ maximum }) {
	const randomItem = useRandomItem(maximum);

	return (
		<div>
			<h2>Random Item Picker</h2>
			<p>The item retrieved from the backend has an ID of {randomItem}</p>
		</div>
	);
}

export default RandomItem;
