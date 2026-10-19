package com.bikinibottom;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 比奇堡登录注册后端服务启动类
 */
@SpringBootApplication
@MapperScan("com.bikinibottom.mapper")
public class SpongebobBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SpongebobBackendApplication.class, args);
    }
}
