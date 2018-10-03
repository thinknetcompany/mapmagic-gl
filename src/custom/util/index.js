// @flow
const randomID = () => {
    const subRand = () => {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (`${subRand() + subRand()}-${subRand()}-${subRand()}-${subRand()}-${subRand()}${subRand()}${subRand()}`);
};

export {
    randomID,
};
