export const setItem = async (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const getItem = async (key) => {

  return JSON.parse(localStorage.getItem(key));
};

export const removeItem = async (key) => {
   localStorage.removeItem(key);
};
