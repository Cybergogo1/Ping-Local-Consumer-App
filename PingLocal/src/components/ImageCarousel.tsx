import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Image,
  FlatList,
  Dimensions,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageCarouselProps {
  images: string[];
  height?: number;
  autoPlayInterval?: number;
}

const placeholderImage = require('../../assets/images/placeholder_offer.jpg');

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  height = 250,
  autoPlayInterval = 4000,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUserScrollingRef = useRef(false);

  const validImages = images.filter((img) => img && img.length > 0);

  const startAutoPlay = useCallback(() => {
    if (validImages.length <= 1) return;

    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
    }

    autoPlayTimerRef.current = setInterval(() => {
      if (isUserScrollingRef.current) return;

      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % validImages.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, autoPlayInterval);
  }, [validImages.length, autoPlayInterval]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, [startAutoPlay, stopAutoPlay]);

  const onScrollBeginDrag = () => {
    isUserScrollingRef.current = true;
    stopAutoPlay();
  };

  const onScrollEndDrag = () => {
    isUserScrollingRef.current = false;
    startAutoPlay();
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(newIndex);
  };

  // Single image or no images - render static
  if (validImages.length <= 1) {
    const imageSource = validImages.length === 1
      ? { uri: validImages[0] }
      : placeholderImage;

    return (
      <Image
        source={imageSource}
        style={[styles.image, { height }]}
        resizeMode="cover"
      />
    );
  }

  // Multiple images - render carousel
  return (
    <FlatList
      ref={flatListRef}
      data={validImages}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onScrollBeginDrag={onScrollBeginDrag}
      onScrollEndDrag={onScrollEndDrag}
      onMomentumScrollEnd={onMomentumScrollEnd}
      keyExtractor={(item, index) => `carousel-${index}`}
      getItemLayout={(_, index) => ({
        length: SCREEN_WIDTH,
        offset: SCREEN_WIDTH * index,
        index,
      })}
      renderItem={({ item }) => (
        <Image
          source={{ uri: item }}
          style={[styles.image, { height, width: SCREEN_WIDTH }]}
          resizeMode="cover"
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
  },
});

export default ImageCarousel;
