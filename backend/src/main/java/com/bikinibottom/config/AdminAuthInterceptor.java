package com.bikinibottom.config;

import com.bikinibottom.common.Result;
import com.bikinibottom.service.AdminAuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 后台鉴权拦截器：保护 /api/admin/** 下所有用户管理接口。
 * 放行登录接口本身；其余请求必须带有效管理员 token（Authorization: Bearer &lt;token&gt;）。
 */
@Component
public class AdminAuthInterceptor implements HandlerInterceptor {

    private final AdminAuthService adminAuthService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AdminAuthInterceptor(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        // 预检请求直接放行（CORS）
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true;
        String header = request.getHeader("Authorization");
        String token = (header != null && header.startsWith("Bearer ")) ? header.substring(7).trim() : null;
        String username = adminAuthService.verify(token);
        if (username != null) return true;

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        Result<Void> body = Result.error("未授权：请先登录管理员账号（token 缺失、过期或无效）");
        body.setCode(401);
        response.getWriter().write(objectMapper.writeValueAsString(body));
        return false;
    }
}
