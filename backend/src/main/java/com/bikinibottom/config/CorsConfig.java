package com.bikinibottom.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 跨域配置：允许局域网内任意设备的前端访问后端
 * ---------------------------------------------------------------
 * 使用 allowedOriginPatterns（带通配符），不再写死单个 IP：
 *   · http://192.168.68.9:5173  开发服务器
 *   · http://192.168.68.9:8081  在线浏览静态站点
 *   · http://192.168.x.x:*      局域网内其它机器 / 手机
 * 通配符写法：端口用 [*] 表示任意端口。
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(
                        "http://localhost:[*]",
                        "http://127.0.0.1:[*]",
                        "http://192.168.*.*:[*]",
                        "http://10.*.*.*:[*]",
                        "http://172.*.*.*:[*]",
                        "https://192.168.*.*:[*]",
                        "https://10.*.*.*:[*]",
                        "https://172.*.*.*:[*]")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }
}
