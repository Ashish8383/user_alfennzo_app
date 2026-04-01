let _showLoader = null;
let _hideLoader = null;

export const showLoader = (options) => {
  if (_showLoader) _showLoader(options);
};

export const hideLoader = () => {
  if (_hideLoader) _hideLoader();
};

export function useLoaderController() {
  const registerHandler = (show, hide) => {
    _showLoader = show;
    _hideLoader = hide;
  };
  return { registerHandler };
}