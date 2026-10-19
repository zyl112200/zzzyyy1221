package com.bikinibottom.controller;

import com.bikinibottom.common.Result;
import com.bikinibottom.dto.BuyRequest;
import com.bikinibottom.dto.GameProfile;
import com.bikinibottom.entity.Item;
import com.bikinibottom.service.GameService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 商店接口
 */
@RestController
@RequestMapping("/api/shop")
public class ShopController {

    private final GameService gameService;

    public ShopController(GameService gameService) {
        this.gameService = gameService;
    }

    /** 商品目录：GET /api/shop/items */
    @GetMapping("/items")
    public Result<List<Item>> items() {
        return gameService.shopItems();
    }

    /** 购买：POST /api/shop/buy { "username": "xxx", "itemId": 1, "quantity": 1 } */
    @PostMapping("/buy")
    public Result<GameProfile> buy(@RequestBody BuyRequest req) {
        return gameService.buy(req.getUsername(), req.getItemId(), req.getQuantity());
    }
}
