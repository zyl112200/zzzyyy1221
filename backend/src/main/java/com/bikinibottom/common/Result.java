package com.bikinibottom.common;

import lombok.Data;

/**
 * 统一返回体
 */
@Data
public class Result<T> {

    private Integer code;
    private String message;
    private T data;

    public static <T> Result<T> success(T data) {
        Result<T> r = new Result<>();
        r.setCode(200);
        r.setMessage("success");
        r.setData(data);
        return r;
    }

    public static <T> Result<T> success(String message, T data) {
        Result<T> r = new Result<>();
        r.setCode(200);
        r.setMessage(message);
        r.setData(data);
        return r;
    }

    public static <T> Result<T> error(String message) {
        Result<T> r = new Result<>();
        r.setCode(400);
        r.setMessage(message);
        return r;
    }
}
