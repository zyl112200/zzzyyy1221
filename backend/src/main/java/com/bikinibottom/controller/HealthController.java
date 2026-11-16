package com.bikinibottom.controller;

import com.bikinibottom.common.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetAddress;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 健康检查：GET /api/health
 * ---------------------------------------------------------------
 * 前端在「自动模式」下会先探测这个接口，通了才走在线后端，不通就退回本地引擎。
 * 也是验证局域网连通性的最快方式：手机/其它电脑浏览器直接打开
 *   http://192.168.68.9:8080/api/health
 * 能看到 code=200 即说明后端与网络都通了。
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public Result<Map<String, Object>> health() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "UP");
        data.put("service", "spongebob-backend");
        data.put("hostname", hostname());
        data.put("time", LocalDateTime.now().toString());
        return Result.success("在线后端已就绪", data);
    }

    private String hostname() {
        try {
            return InetAddress.getLocalHost().getHostAddress();
        } catch (Exception e) {
            return "unknown";
        }
    }
}
