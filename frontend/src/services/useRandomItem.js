import { useState, useEffect } from "react";

/**

 * @param {number} maximum The maximum allowed value
 * @returns {number} A random value from the API
 */
function useRandomItem(maximum) {
	
	const [randomItem, setRandomItem] = useState(null);

	
	useEffect(() => {
		const value = getRandomItem(maximum);
		setRandomItem(value);
	}, [maximum]);

	return randomItem;
}

async function getRandomItem(maximum) {
	const params = new URLSearchParams({ maximum });
	
	const res = await fetch(`/api/random?${params}`);
	

	return data.itemId;
}

export default useRandomItem;
