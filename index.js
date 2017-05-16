const express = require('express');
const superagent = require('superagent');
const app = express();

const cache = [];
const getCache = (key) => {
  for (const item of cache) {
    if (item.key === key) {
      return item.data;
    }
  }
  return false;
}
const setCache = (key, options) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const expire = options.expire || 12 * 3600;

  let keyValue = '';
  for (const item of cache) {
    if (item.key === key) {
      keyValue = item;
      item.data = options.data;
      item.expire = new Date().getTime() + expire * 1000;
    }
  }
  if (!keyValue) {
    cache.push({
      key,
      expire: new Date().getTime() + expire * 1000,
      data: options.data
    })
  }
}

const cacheCheck = (req, res, next) => {
  // 超出10000条cache，删除前10条，防止服务器挂了
  if (cache.length > 10000) {
    cache.splice(0, 10);
  }
  for (let i = 0; i < cache.length; i++) {
    const item = cache[i];
    if (!item.expire || item.expire <= new Date().getTime()) {
      cache.splice(i, 1);
      i--;
    }
  }
  next();
}

const handle = (req, res, next) => {
  const body = req.query;
  const url = body.url;
  const expire = body.expire;
  const key = `${url}_${JSON.stringify(body)}`;
  body.url && delete body.url;
  body.expire && delete body.expire;

  const cacheData = getCache(key);
  if (cacheData) {
    return res.send(cacheData);
  }
  if (!url) {
    return res.send([]);
  }
  superagent
    .get(url)
    .query(body)
    .end((err, data) => {
      if (err) {
        return res.send(err);
      }
      setCache(key, {
        expire,
        data: data.body,
      })
      res.send(data.body);
    });
}
app.get('/cache', cacheCheck, handle);

app.use((err, req, res, next) => {
  if (err) {
    console.error(err);
    res.status(500).end('server 500');
  }
});

app.listen(8001, () => {
  console.log('listen to 8001');
});