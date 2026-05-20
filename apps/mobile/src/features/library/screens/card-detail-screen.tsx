import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { ScreenHeader } from "../../../components/ui/screen-header";
import { type LibraryStackParamList } from "../../../navigation/types";
import { useCardDetailQuery } from "../api";
import { CardStatusBadge } from "../components/card-status-badge";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { formatDateTimeLabel, getSourceTypeLabel } from "../utils/library-formatters";
import { getStableArray } from "../utils/library-state";
import { cardDetailScreenStyles as styles } from "./card-detail-screen.styles";

export function CardDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<LibraryStackParamList, "CardDetail">) {
  const cardQuery = useCardDetailQuery(route.params.cardId);
  const card = cardQuery.data;
  const tagPreview = useMemo(() => getStableArray(card?.tags), [card?.tags]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        onRightPress={
          card?.sourceId
            ? () =>
                navigation.navigate("SourceDetail", {
                  sourceId: card.sourceId as string,
                })
            : undefined
        }
        rightLabel={card?.sourceId ? "查看来源" : undefined}
        subtitle="卡片详情"
        title={card?.title ?? "知识卡片详情"}
      />

      {cardQuery.isLoading ? (
        <View style={styles.stateWrap}>
          <EmptyState description="正在读取卡片详情，请稍等片刻。" title="正在加载卡片" />
        </View>
      ) : null}

      {cardQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            description={
              cardQuery.error instanceof Error
                ? cardQuery.error.message
                : "暂时无法读取这张卡片，请稍后再试。"
            }
            onRetry={() => cardQuery.refetch()}
            retryLabel="重新加载"
            title="卡片详情加载失败"
          />
        </View>
      ) : null}

      {card ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>{card.title}</Text>
                <Text style={styles.heroMeta}>
                  {getSourceTypeLabel(card.sourceType)} · 最近更新 {formatDateTimeLabel(card.updatedAt)}
                </Text>
              </View>
              <CardStatusBadge status={card.status} />
            </View>

            {tagPreview.length > 0 ? (
              <View style={styles.tagsRow}>
                {tagPreview.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagLabel}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>卡片内容</Text>
            <Text style={styles.sectionText}>{card.content}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>来源信息</Text>
            <Text style={styles.infoLabel}>来源类型</Text>
            <Text style={styles.infoValue}>{getSourceTypeLabel(card.sourceType)}</Text>
            <Text style={styles.infoLabel}>来源 ID</Text>
            <Text style={styles.infoValue}>{card.sourceId ?? "这张卡片暂时没有来源 ID"}</Text>
            <Text style={styles.infoLabel}>创建时间</Text>
            <Text style={styles.infoValue}>{formatDateTimeLabel(card.createdAt)}</Text>
            <Text style={styles.infoLabel}>更新时间</Text>
            <Text style={styles.infoValue}>{formatDateTimeLabel(card.updatedAt)}</Text>

            {card.sourceId ? (
              <PrimaryButton
                label="查看同来源卡片"
                onPress={() =>
                  navigation.navigate("CardList", {
                    sourceId: card.sourceId as string,
                  })
                }
                variant="secondary"
              />
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
