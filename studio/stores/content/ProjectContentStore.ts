import { makeAutoObservable } from 'mobx'
import { keyBy } from 'lodash'

import { get, post, patch, delete_ } from 'lib/common/fetch'
import { UserContentMap } from 'types'
import { IRootStore } from '../RootStore'
import { API_URL } from 'lib/constants'

// [Joshen] This will be the new ProjectContentStore
// but use the one under the stores folder projectContentStore first while we transition

export interface IProjectContentStore {
  isLoading: boolean
  error: any

  load: () => void
  list: (filter?: any) => any[]
  reports: (filter?: any) => any[]
  sqlSnippets: (filter?: any) => any[]
}

export default class ProjectContentStore implements IProjectContentStore {
  rootStore: IRootStore

  STATES = {
    INITIAL: 'initial',
    LOADING: 'loading',
    ERROR: 'error',
    LOADED: 'loaded',
  }

  baseUrl: string
  data: UserContentMap = {}

  state = this.STATES.INITIAL
  error = null

  constructor(rootStore: IRootStore, options: { projectRef: string }) {
    const { projectRef } = options

    this.rootStore = rootStore
    this.baseUrl = `${API_URL}/projects/${projectRef}/content`
    makeAutoObservable(this)
  }

  get isLoading() {
    return this.state === this.STATES.INITIAL || this.state === this.STATES.LOADING
  }

  async fetchData() {
    const headers = {
      'Content-Type': 'application/json',
    }
    const response = await get(this.baseUrl, { headers })
    if (response.error) {
      throw response.error
    }
    this.data = keyBy(response, 'id')
    return response
  }

  async load() {
    let { LOADING, ERROR, LOADED } = this.STATES
    try {
      this.error = null
      this.state = LOADING
      await this.fetchData()
      this.state = LOADED
      return this.data
    } catch (e: any) {
      console.error('Failed to load project content', e.message)
      this.error = e
      this.state = ERROR
    }
  }

  async loadPersistentData() {}

  async loadRemotePersistentData(userId: any) {
    const sqlSnippets = this.sqlSnippets((x: any) => x.owner_id === userId)
  }

  list(filter?: any) {
    const arr = Object.values(this.data)
    if (!!filter) {
      return arr.filter(filter).sort((a, b) => a.name.localeCompare(b.name))
    } else {
      return arr.sort((a, b) => a.name.localeCompare(b.name))
    }
  }

  byId(id: any) {
    return this.data[id]
  }

  reports(filter?: any) {
    let arr = Object.values(this.data)
    if (!!filter) {
      return arr
        .filter((x) => x.type == 'report')
        .filter(filter)
        .sort((a, b) => a.name.localeCompare(b.name))
    } else {
      return arr.filter((x) => x.type == 'report').sort((a, b) => a.name.localeCompare(b.name))
    }
  }

  sqlSnippets(filter?: any) {
    let arr = Object.values(this.data)
    if (!!filter) {
      const arr_filtered = arr
        .filter((x) => x.type == 'sql')
        .filter(filter)
        .sort((a, b) => a.name.localeCompare(b.name))

      return arr_filtered
    } else {
      const arr_filtered = arr
        .filter((x) => x.type == 'sql')
        .sort((a, b) => a.name.localeCompare(b.name))

      return arr_filtered
    }
  }

  async create(payload: any) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      }
      const created = await post(this.baseUrl, payload, { headers })
      if (created.error) throw created.error
      this.data[created['id']] = created
      return { data: created, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async update(id: any, updates: any, type: string) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      }
      let payload = {
        ...updates,
        type,
        id,
      }
      const url = `${this.baseUrl}?id=${id}`
      const updated = await patch(url, payload, { headers })
      if (updated.error) throw updated.error
      this.data[id] = updated
      return { data: updated, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async updateSql(id: any, updates: any) {
    return this.update(id, updates, 'sql')
  }

  async updateReport(id: any, updates: any) {
    return this.update(id, updates, 'report')
  }

  async del(id: any) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      }
      const url = `${this.baseUrl}?id=${id}`
      const deleted = await delete_(url, {}, { headers })
      if (deleted.error) throw deleted.error
      delete this.data[id]
      return { data: true, error: null }
    } catch (error) {
      return { data: false, error }
    }
  }
}
