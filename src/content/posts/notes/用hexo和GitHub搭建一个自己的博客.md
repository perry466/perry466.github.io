---
title: "用hexo和GitHub搭建一个自己的博客"
description: "1、安装Git和Node.js1、在官网下载好git和node.js，如果git官网下载太慢，可以去腾讯网中的软件中心下载。"
pubDate: 2024-11-06T12:50:12+08:00
category: notes
tags:
  - hexo
  - github
  - Blog
---

# 1、安装Git和Node.js

1、在官网下载好git和node.js，如果git官网下载太慢，可以去腾讯网中的软件中心下载。  
2、下载完成后win+R建输入cmd回车，在命令提示符中分别输入git -v和node -v查看版本信息，如果显示出版本信息则表示安装成功。命令如下：

```bash
git -v
```
```bash
node -v
```

# 2、安装Hexo

打开git bash命令框，输入以下命令：

```bash
$ npm install -g hexo-cli
```

这里可能需要等一会，取决于你的网速。

# 3、创建Blog

1、安装完成后，新建一个文件夹，在里面右击打开git bash命令框  
2、用命令创建博客目录

```bash
$ hexo init myBlog
```

3、进入博客目录，依次执行以下命令

```bash
$ cd myBlog
```
```bash
$ npm install
```

# 4、本地测试

1、在git bash输入以下命令，一键三连

```bash
$ hexo clean && hexo g && hexo s
```

执行完命令后在命令框会出现一个本地网址localhost:4000(默认端口号为4000)  
2、打开浏览器，输入网址localhost:4000，出现博客页面即为成功，在git bash中按crtl+c可返回

# 5、把hexo部署到Github上

1、首先要注册一个Github账号，如果官网打不开可以在微软商店下载Watt Toolkit（Windows系统）  
2、找到your repositories，创建一个yourname.github.io的仓库，此处的yourname为你的GitHub账户名  
3、在博客目录下打开git bash，输入以下命令安装hexo-deployer-git插件

```bash
$ npm install hexo-deployer-git --save
```

4、编辑博客目录下的\_config.yml文件，在末尾修改配置文件：

```plaintext
deploy:
type: git
repo: github上对应仓库的ssh 链接
//也可使用https地址，如：https://github.com/yourname/yourname.github.io.git
branch: main
```

此处的ssh链接：打开GitHub中刚刚创建的仓库，点击code，点击ssh，下面就有 [git@github.com](mailto:git@github.com):yourname/yourname.github.io.git格式的ssh链接，复制粘贴即可  
5、把本地博客推送到GitHub上

```bash
$ hexo clean && hexo g && hexo d
```

一键三连也可以，也可以一步一步来，执行命令后可能要输入GitHub的密码，如果hexo d报错，可以参考以下文章[http://os-roc.github.io/2024/10/30/关于hexo-d命令报错/](http://os-roc.github.io/2024/10/30/%E5%85%B3%E4%BA%8Ehexo-d%E5%91%BD%E4%BB%A4%E6%8A%A5%E9%94%99/)

# 6、更换主题

1、可以在hexo官网寻找合适的主题，点击后可以进入对应的GitHub仓库中，可以选择下载压缩包，然后解压到博客目录下的themes文件夹中，或者使用clone命令来下载，在博客1目录下的themes目录下打开git bash，输入以下命令：

```bash
$ git clone git@github.com:blinkfox/hexo-theme-matery.git
```

下载后就可以看到对应的主题文件

# 7、主题的配置以及使用

## 1、切换主题

1、打开博客目录下的\_config.yml文件，找到其中的theme值修改为你下载的主题的文件名，下载的主题文件名可以修改，比如文件名为next，那值就修改为theme： next，注意冒号后面要加一个空格，否则会报错，后续操作同理

## 2、语言选择

2、如果为中文用户，则在language：后添加zh-CN，不修改默认为英语

## 3、网址修改

3、url：为你的网址名，如[http://yourname.github.io](http://yourname.github.io/) ,如果有自己的域名，则修改为自己的域名1即可

## 4、创建标签页面

tags是展示标签的页面，如果在博客source目录下没有tags/insex.md文件，那你就得新建一个，在source目录下打开git bash，输入以下命令：

```bash
$ hexo new page "tags"
```

创建categories分类页面和about关于我的界面同理，命令如下：

```bash
$ hexo new page "categories"
$hexo new page "about"
```

# 8、博客的编写以及推送

## 1、创建md文件

在博客目录下打开git bash，输入以下命令：

```bash
$ hexo new post "newblog"
```

此文档默认内容如下：

```plaintext
title: newblog
date: xxxx-xx-xx xx:xx:xx
tags:
```

## 2、编写保存

在文档下编辑内容即可，注意此处使用的是markdown语法，使用crtl+s保存即可

## 3、推送到仓库

在博客目录下打开git bash，输入命令：

```bash
$ hexo clean
$ hexo g
$ hexo d
```

创建完成后访问自己的网址即可看到创建的博客内容

  

至此，我们的博客搭建完毕！
