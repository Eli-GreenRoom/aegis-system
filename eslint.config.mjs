import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [...next, ...nextCoreWebVitals];

export default eslintConfig;
