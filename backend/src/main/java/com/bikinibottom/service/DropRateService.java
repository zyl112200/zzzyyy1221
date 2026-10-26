package com.bikinibottom.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.bikinibottom.entity.CatchRate;
import com.bikinibottom.mapper.CatchRateMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 钓鱼爆率服务：读取 catch_rate 表里各品级的相对权重。
 * <p>GameService 在抽取品级时会用
 * {@code dropRateService.getWeightMap().getOrDefault(tierCode, 内置默认值)}，
 * 表里没配置的品级自动回退到内置默认权重，所以该表允许为空。</p>
 */
@Service
public class DropRateService {

    private final CatchRateMapper catchRateMapper;

    /** tierCode -> 相对权重（仅启用中的配置） */
    private volatile Map<String, Integer> weightMap = Map.of();

    public DropRateService(CatchRateMapper catchRateMapper) {
        this.catchRateMapper = catchRateMapper;
    }

    /** 启动时加载一次；后台修改配置后调用 {@link #reload()} 即时生效 */
    @PostConstruct
    public void load() {
        List<CatchRate> list = catchRateMapper.selectList(
                Wrappers.<CatchRate>lambdaQuery()
                        .eq(CatchRate::getEnabled, 1)
                        .orderByAsc(CatchRate::getId));
        Map<String, Integer> map = new LinkedHashMap<>();
        for (CatchRate c : list) {
            if (c.getTierCode() == null || c.getBaseWeight() == null) {
                continue;
            }
            map.put(c.getTierCode(), c.getBaseWeight());
        }
        this.weightMap = Map.copyOf(map);
    }

    /** 重新从数据库加载（供后台修改爆率后调用） */
    public void reload() {
        load();
    }

    public Map<String, Integer> getWeightMap() {
        return weightMap;
    }
}
