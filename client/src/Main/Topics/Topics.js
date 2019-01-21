import React, {Component} from 'react';
import {
  StyleSheet, 
  View,
  FlatList,
  Alert,
  TouchableOpacity
} from 'react-native';

import {debounce} from 'throttle-debounce';
import jwt_decode from 'jwt-decode';

import Topic from '../shared/Topic/Topic';
import User from '../shared/User/User';
import DoubleSelect from '../shared/DoubleSelect/DoubleSelect';
import Input from '../../shared/Input/Input';

import api from '../../shared/api';

export default class Topics extends Component {
  constructor (props) {
    super(props);
    this.state = {
      topics: [],
      searchResults: [],
      page: 1,
      sort: 'popular',
      searchOption: 'topics',
      optionType: 'sort',
      search: '',
      refreshing: false,
      dataEnd: false
    };
    this.listTopicsDebounced = debounce(100, this.listTopics);
    this.searchDebounced = debounce(100, this.search);
  }
  
  listTopics = (state = {}) => {
    api(
      {
        path: `topics/list/${this.state.sort}/${this.state.page}`,
        method: 'GET',
        jwt: this.props.navigation.getParam('jwt', ''),
      },
      (err, res) => {
        if (err && !res) {
          if (err === 'unauthenticated') return this.props.logout();
          return Alert.alert(err);
        }
        
        this.setState({
          ...state,
          topics: this.state.topics.concat(res.topics),
          dataEnd: res.topics.length < 10
        });
      }
    );
  }
  search = (state = {}) => {
    api(
      {
        path: `search/${this.state.searchOption}/${this.state.search}`,
        method: 'GET',
        jwt: this.props.navigation.getParam('jwt', ''),
      },
      (err, res) => {
        if (err && !res) {
          if (err === 'unauthenticated') return this.props.logout();
          return Alert.alert(err);
        }
        
        this.setState({
          ...state,
          searchResults: res[this.state.searchOption],
        });
      }
    );
  }
  nextPage = () => {
    if (!this.state.dataEnd && this.direction === 'down' && this.offset > 0 && this.state.optionType === 'sort') {
      this.setState({
        page: this.state.page + 1
      }, this.listTopicsDebounced);
    }
  }

  onRefresh = () => {
    this.setState(
      {
        refreshing: true,
        dataEnd: false,
        topics: [],
        searchResults: [],
        page: 1
      }, 
      () => this.state.optionType === 'sort' ? this.listTopicsDebounced({refreshing: false}) : this.searchDebounced({refreshing: false})
    );
  }
  onChangeOption = option => {
    this.setState({[this.state.optionType === 'sort' ? 'sort' : 'searchOption']: option}, this.onRefresh);
  }
  onChangeText = search => {
    if (search && search.length > 0) {
      if (this.state.optionType === 'search') {
        this.setState({search}, this.onRefresh);
      } else {
        this.setState({search, optionType: 'search'}, this.onRefresh);
      }
    } else {
      this.setState({search: '', optionType: 'sort'}, this.onRefresh);
    }
  }

  componentDidMount = this.onRefresh;

  render() {
    let renderItem;
    let data;

    if (this.state.optionType === 'sort') {
      data = this.state.topics;
      renderItem = ({item}) => (
        <TouchableOpacity 
          key={item.topic}
          onPress={() => this.props.navigation.push('Topic', {topic: item.topic, jwt: this.props.navigation.getParam('jwt', '')})}
        >
          <Topic
            topic={item.topic}
            posts={item.posts}
          />
        </TouchableOpacity>
      );
    } else if (this.state.optionType === 'search'){
      if (this.state.searchOption === 'topics') {
        data = this.state.searchResults;
        renderItem = ({item}) => (
          <TouchableOpacity 
            key={item.topic}
            onPress={() => this.props.navigation.push('Topic', {topic: item.topic, jwt: this.props.navigation.getParam('jwt', '')})}
          >
            <Topic
              topic={item.topic}
              posts={item.posts}
              search={this.state.search}
            />
          </TouchableOpacity>
        );
      } else if (this.state.searchOption === 'users') {
        data = this.state.searchResults;
        renderItem = ({item}) => (
          <TouchableOpacity 
            key={item._id}
            onPress={() => this.props.navigation.push('Profile', {
              user: item._id === jwt_decode(this.props.navigation.getParam('jwt', '')).user ? null : item._id,
              jwt: this.props.navigation.getParam('jwt', '')})
            }
          >
            <User 
              user={item} 
              search={this.state.search}
            />
          </TouchableOpacity>
        );
      }
    }

    return (
      <View style={styles.container}>
        <FlatList               
          style={styles.topics}
          contentContainerStyle={styles.topicsContent}
          showsVerticalScrollIndicator={false}
          refreshing={this.state.refreshing}
          onRefresh={this.onRefresh}
          data={data}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          initialNumToRender={10}
          onEndReachedThreshold={0.5}
          onEndReached={this.nextPage}
          onScroll={(event) => {
            const currentOffset = event.nativeEvent.contentOffset.y;
            this.direction = currentOffset > this.offset ? 'down' : 'up';
            this.offset = currentOffset;
          }}
          ListHeaderComponent={() => [
            <Input 
              key="Input"
              placeholder="Kişi veya konu ara"
              value={this.state.search}
              onChangeText={this.onChangeText}
              containerStyle={{marginBottom: 15}}
            />,
            <DoubleSelect 
              key="DoubleSelect"
              options={this.state.optionType === 'sort' ? {
                popular: 'Popüler',
                new: 'Yeni'
              } : {
                topics: 'Konular',
                users: 'Kullanıcılar'
              }}
              option={this.state.optionType === 'sort' ? this.state.sort : this.state.searchOption}
              onChangeOption={this.onChangeOption}
            />
          ]}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  topics: {
    flex: 1
  },
  topicsContent: {
    marginTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 15
  }
});