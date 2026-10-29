---
title: "关于hexo d命令报错"
description: "1、部署出现问题在将hexo部署到GitHub上时，hexod命令时常会出现各种问题，error：spawnfailed等报错。"
pubDate: 2024-10-30T19:23:53+08:00
category: notes
tags:
  - hexo命令报错
  - github部署
  - hexo d
---

# 1、部署出现问题

在将hexo部署到GitHub上时，hexo d命令时常会出现各种问题，error：spawn failed等报错。

# 2、解决方法

我个人的解决方法是把加速GitHub网站的加速器关掉，然后再尝试一键三连：

```bash
$ hexo clean && hexo g && hexo d
```

一般来说执行上述命令就可成功将hexo部署到GitHub上，此时稍等一会会弹出一个GitHub授权的界面，点击授权，稍等一会，就可以去访问自己的网站是否部署成功了。如果还是没有成功，可以试一下用手机热点或者数据线连接共享手机网络给电脑，失败也有可能是网络原因导致。
