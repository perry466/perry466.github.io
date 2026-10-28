---

title: "在 Ubuntu 22.04 LTS 上部署可道云网盘（KodBox）—— 小白级教程"
description: "在 Ubuntu 22.04 LTS 上部署可道云网盘（KodBox）—— 小白级教程"
pubDate: 2026-10-28
category: tech
tags: ["ubuntu", "可道云","kodbox"]
---

------

## 第一步：更新系统并安装基础软件

在终端窗口（看到 `#` 或 `$` 提示符的地方）

一条一条复制并回车运行

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx mysql-server redis-server
sudo apt install -y php php-fpm php-mysql php-gd php-redis php-mbstring php-curl php-xml php-zip php-json
sudo systemctl disable apache2.service
sudo systemctl enable nginx php8.1-fpm mysql redis-server
```

> 输入 `sudo` 开头的命令后，如果提示输入密码，直接输入你的登录密码（输入时不显示字符），按回车即可。

------

## 第二步：安装图片和视频处理工具

在终端窗口输入：

```bash
sudo apt install -y imagemagick ffmpeg
```

------

## 第三步：配置 Nginx

**1. 打开配置文件：**

```bash
sudo nano /etc/nginx/sites-enabled/default
```

> 执行后屏幕会变成编辑器界面，底部有操作提示。

**2. 在编辑器里找到这几行，确认无误（没有就添加）：**

```nginx
listen 80;
root /var/www/html;
server_name _;
```

**3. 在文件里的 `server { }` 块中，添加以下配置（放在 `location / { }` 后面）：**

```nginx
location ~ [^/]\.php(/|$) {
    try_files $uri =404;
    fastcgi_pass unix:/run/php/php8.1-fpm.sock;
    fastcgi_index index.php;
    set $path_info $fastcgi_path_info;
    set $real_script_name $fastcgi_script_name;
    if ($fastcgi_script_name ~ "^(.+?\.php)(/.+)$") {
        set $real_script_name $1;
        set $path_info $2;
    }
    fastcgi_param SCRIPT_FILENAME $document_root$real_script_name;
    fastcgi_param SCRIPT_NAME $real_script_name;
    fastcgi_param PATH_INFO $path_info;
    include fastcgi_params;
}
```

> 用键盘方向键移动光标，复制粘贴进去。

**4. 保存退出：**

- 按 `Ctrl + O`，再按回车 → 保存
- 按 `Ctrl + X` → 退出

**5. 检查配置并重启：**

```bash
sudo nginx -t
sudo systemctl restart nginx
```

------

## 第四步：配置 PHP

在终端窗口输入：

```bash
PHP_INI=/etc/php/8.1/fpm/php.ini
PHP_FPM=/etc/php/8.1/fpm/pool.d/www.conf

sudo sed -i \
  -e "s/max_execution_time = .*/max_execution_time = 3600/g" \
  -e "s/max_input_time = .*/max_input_time = 3600/g" \
  -e "s/memory_limit = .*/memory_limit = 512M/g" \
  -e "s/post_max_size = .*/post_max_size = 512M/g" \
  -e "s/upload_max_filesize = .*/upload_max_filesize = 512M/g" \
  ${PHP_INI}

sudo sed -i \
  -e "s/pm.max_children = .*/pm.max_children = 100/g" \
  -e "s/pm.start_servers = .*/pm.start_servers = 10/g" \
  -e "s/pm.min_spare_servers = .*/pm.min_spare_servers = 10/g" \
  -e "s/pm.max_spare_servers = .*/pm.max_spare_servers = 50/g" \
  -e "s/;pm.max_requests = 500/pm.max_requests = 500/g" \
  -e "s/;listen.mode = 0660/listen.mode = 0666/g" \
  ${PHP_FPM}

sudo systemctl restart php8.1-fpm
```

------

## 第五步：配置 MySQL 数据库

在终端窗口输入：

**1. 进入 MySQL（此时不需要密码）：**

```bash
sudo mysql
```

> 提示符变成 `mysql>`，表示已进入 MySQL 环境。

**2. 设置 root 密码（把 `xxxx` 换成你自己的密码）：**

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'xxxx';
quit;
```

**3. 运行安全向导：**

```bash
sudo mysql_secure_installation
```

> 按提示操作：启用密码强度检查、删除匿名用户、禁止 root 远程登录、删除测试数据库、重新加载权限。

**4. 再次进入 MySQL（这次需要输入密码）：**

```bash
sudo mysql -u root -p
```

> 提示输入密码时，输入刚才设的 root 密码。

**5. 创建 KodBox 数据库和用户（把 `username` 和 `password` 换成你自己的）：**

```sql
CREATE USER 'username'@'localhost' IDENTIFIED BY 'password';
CREATE DATABASE IF NOT EXISTS kodbox CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
GRANT ALL PRIVILEGES ON kodbox.* TO 'username'@'localhost';
FLUSH PRIVILEGES;
quit;
```

> 记住你设的用户名和密码，后面要用。

------

## 第六步：下载并安装 KodBox

在终端窗口输入：

```bash
sudo apt install -y unzip
cd /var/www/html/
sudo curl -L "https://api.kodcloud.com/?app/version&download=server.link" -o kodbox.zip
sudo unzip kodbox.zip && sudo rm kodbox.zip
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo systemctl restart nginx
```

------

## 第七步：配置防火墙

在终端窗口输入：

```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw enable
```

> 提示是否继续时，输入 `y` 按回车。

------

## 第八步：浏览器访问完成安装

**在哪里操作**：你的电脑浏览器（Chrome、Edge 等）

**访问地址**：`http://你的服务器IP地址`

> 如果你不知道服务器 IP，在**终端窗口**执行 `ip addr` 查看。

**按网页向导填写数据库信息**：

- 数据库服务器：`localhost`
- 数据库名：`kodbox`
- 用户名：第五步设的（如 `koduser`）
- 密码：第五步设的密码

然后设置管理员账号，完成安装。

------

## 常用维护命令

```bash
# 查看各服务状态
sudo systemctl status nginx
sudo systemctl status php8.1-fpm
sudo systemctl status mysql
sudo systemctl status redis-server

# 重启所有服务
sudo systemctl restart nginx php8.1-fpm mysql redis-server

# 查看网站错误日志
sudo tail -f /var/log/nginx/error.log
```